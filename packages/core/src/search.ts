import { localized } from "./localized.ts";
import type { Locale } from "./messages.ts";
import { normalizeName } from "./rules.ts";
import type { Database } from "./schemas.ts";

export interface SearchHit {
  type: "soc" | "box" | "case";
  id: string;
  title: string;
}

/**
 * Recherche plein texte simple : tous les mots saisis doivent apparaître (insensible à la casse,
 * aux accents et à la ponctuation). Les SoC et les modèles passent avant les cas signalés.
 */
export function searchDatabase(
  db: Database,
  query: string,
  locale: Locale,
  limit = 20,
): SearchHit[] {
  const terms = query
    .split(/\s+/)
    .map((t) => normalizeName(t))
    .filter(Boolean);
  if (terms.length === 0) return [];
  const matches = (text: string) => {
    const hay = normalizeName(text);
    return terms.every((t) => hay.includes(t));
  };

  const hits: SearchHit[] = [];
  for (const s of db.socs) {
    if (matches([s.id, s.vendor, s.name, ...s.aliases, s.arch ?? ""].join(" "))) {
      hits.push({ type: "soc", id: s.id, title: `${s.vendor} ${s.name}` });
    }
  }
  for (const m of db.models) {
    if (matches([m.id, m.name, ...m.aliases, m.brand ?? ""].join(" "))) {
      hits.push({ type: "box", id: m.id, title: m.name });
    }
  }
  for (const c of db.cases) {
    if (matches([c.id, c.marketed_name, localized(c, "summary", locale) ?? ""].join(" "))) {
      hits.push({ type: "case", id: c.id, title: c.marketed_name });
    }
  }
  return hits.slice(0, Math.max(1, limit));
}
