import { DatabaseSchema } from "./schemas.ts";
import type { Database } from "./schemas.ts";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  db?: Database;
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

  for (const soc of db.socs) {
    for (const f of ["ram_max_gb", "ram_types", "ethernet_max_mbps", "video_max_decode"] as const) {
      checkSources(`socs/${soc.id}/${f}`, soc[f]?.sources ?? []);
    }
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
