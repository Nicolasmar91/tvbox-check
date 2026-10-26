import { en } from "./en.ts";
import { fr } from "./fr.ts";
import type { Strings } from "./fr.ts";

export type Lang = "fr" | "en";
export const LANGS: readonly Lang[] = ["fr", "en"];
export const DEFAULT_LANG: Lang = "fr";

const dictionaries: Record<Lang, Strings> = { fr, en };
export const useT = (lang: Lang): Strings => dictionaries[lang];

/** Remplace `{nom}` par la valeur correspondante. */
export function fmt(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/**
 * Chemins par langue. Le français reste à la racine (URL historiques), l'anglais est sous `/en/`.
 * Les segments sont traduits : /modele/ ↔ /en/cases/, /recherche/ ↔ /en/search/…
 */
const segments = {
  fr: {
    soc: "soc",
    boxes: "boxes",
    cases: "modele",
    search: "recherche",
    guide: "guide/verifier-les-vraies-specs",
    contribute: "contribuer",
    about: "a-propos",
  },
  en: {
    soc: "soc",
    boxes: "boxes",
    cases: "cases",
    search: "search",
    guide: "guide/verify-real-specs",
    contribute: "contribute",
    about: "about",
  },
} as const;

export type RouteKey = "home" | keyof (typeof segments)["fr"];

export function routePath(lang: Lang, key: RouteKey, id?: string): string {
  const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
  if (key === "home") return `${prefix}/`;
  return `${prefix}/${segments[lang][key]}/${id ? `${id}/` : ""}`;
}

/** Langue d'un chemin d'URL (le préfixe `/en/` désigne l'anglais). */
export function langOfPath(pathname: string): Lang {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

/** Équivalent d'un chemin dans l'autre langue (la page d'accueil si rien ne correspond). */
export function alternatePath(pathname: string, to: Lang): string {
  const from = langOfPath(pathname);
  if (from === to) return pathname;
  const rest = (from === "en" ? pathname.replace(/^\/en/, "") : pathname).replace(/^\/|\/$/g, "");
  if (rest === "") return routePath(to, "home");
  for (const key of Object.keys(segments.fr) as Exclude<RouteKey, "home">[]) {
    const seg = segments[from][key];
    if (rest === seg) return routePath(to, key);
    if (rest.startsWith(`${seg}/`)) return routePath(to, key, rest.slice(seg.length + 1));
  }
  return routePath(to, "home");
}

export const htmlLocale: Record<Lang, string> = { fr: "fr_FR", en: "en_US" };
