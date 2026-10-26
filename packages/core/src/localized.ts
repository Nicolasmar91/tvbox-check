import type { Locale } from "./messages.ts";

/**
 * Texte d'un champ localisé (`summary_fr`, `summary_en`…) : la langue demandée, sinon le français.
 * Les champs `_en` sont exigés par la validation des données ; le repli ne sert qu'aux saisies
 * incomplètes en cours de contribution.
 */
export function localized(obj: object, key: string, locale: Locale): string | null {
  const rec = obj as Record<string, unknown>;
  const value = rec[`${key}_${locale}`] ?? rec[`${key}_fr`];
  return typeof value === "string" ? value : null;
}
