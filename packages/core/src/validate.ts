import { DatabaseSchema } from "./schemas.ts";
import type { Database } from "./schemas.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  db?: Database;
}

/** Domaine enregistrable approximatif : les deux derniers labels (trois pour co.uk, com.au…). */
export function registrableDomain(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const second = labels[labels.length - 2]!;
  const tld = labels[labels.length - 1]!;
  const compound =
    tld.length === 2 && ["co", "com", "org", "net", "gov", "ac", "edu"].includes(second);
  return labels.slice(compound ? -3 : -2).join(".");
}

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

/** Validation structurelle (Zod) + cohérence croisée. Pure : utilisée par la CI et les tests. */
export function validateDatabase(raw: unknown): ValidationResult {
  const parsed = DatabaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join(".") || "(racine)"} : ${i.message}`),
    };
  }
  const db = parsed.data;
  const errors: string[] = [];

  for (const [name, list] of [
    ["sources", db.sources],
    ["socs", db.socs],
    ["cases", db.cases],
    ["models", db.models],
  ] as const) {
    const ids = list.map((x) => x.id);
    for (const d of new Set(duplicates(ids))) errors.push(`${name} : id dupliqué « ${d} »`);
    if (ids.join("\n") !== [...ids].sort().join("\n")) errors.push(`${name} : non trié par id`);
  }

  const sourceIds = new Set(db.sources.map((s) => s.id));
  const socIds = new Set(db.socs.map((s) => s.id));
  const checkSources = (where: string, ids: string[]) => {
    for (const id of ids)
      if (!sourceIds.has(id)) errors.push(`${where} : source inconnue « ${id} »`);
  };

  const domainOf = new Map(db.sources.map((s) => [s.id, registrableDomain(s.url)]));
  for (const soc of db.socs) {
    for (const f of ["ram_max_gb", "ram_types", "ethernet_max_mbps", "video_max_decode"] as const) {
      const field = soc[f];
      checkSources(`socs/${soc.id}/${f}`, field?.sources ?? []);
      // « Recoupée » : les sources doivent venir d'au moins deux domaines différents.
      if (field?.basis === "corroborated") {
        const domains = new Set(field.sources.map((id) => domainOf.get(id)).filter(Boolean));
        if (domains.size < 2) {
          errors.push(
            `socs/${soc.id}/${f} : « corroborated » exige des sources de deux domaines différents`,
          );
        }
      }
    }
  }
  for (const soc of db.socs) {
    soc.community_findings.forEach((f, i) =>
      checkSources(`socs/${soc.id}/community_findings/${i}`, f.sources),
    );
  }
  for (const model of db.models) {
    model.variants.forEach((v, i) => {
      checkSources(`models/${model.id}/variants/${i}`, v.sources);
      if (!socIds.has(v.soc)) {
        errors.push(`models/${model.id}/variants/${i} : SoC inconnu « ${v.soc} »`);
      }
    });
  }
  for (const c of db.cases) {
    checkSources(`cases/${c.id}`, c.sources);
    for (const side of ["marketed", "observed"] as const) {
      const soc = c[side].soc;
      if (soc && !socIds.has(soc)) errors.push(`cases/${c.id}/${side} : SoC inconnu « ${soc} »`);
    }
  }

  return { ok: errors.length === 0, errors, db };
}
