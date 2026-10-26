import type { Locale } from "@tvbox-check/core";
import type { DatabaseState } from "./data.ts";

/** Mention de fraîcheur des données, ajoutée à chaque réponse (les deux langues). */
export function dataNote(state: DatabaseState, locale: Locale): string {
  if (state.source === "online" && state.updatedAt) {
    const date = state.updatedAt.slice(0, 16).replace("T", " ");
    return locale === "fr"
      ? `Données : en ligne, vérifiées le ${date} UTC.`
      : `Data: online, checked on ${date} UTC.`;
  }
  return locale === "fr"
    ? "Données : copie embarquée dans le paquet (hors ligne ou mise à jour en ligne indisponible), peut être en retard sur le site."
    : "Data: snapshot bundled with the package (offline or online update unavailable), may lag behind the site.";
}

export function dataMeta(state: DatabaseState): {
  data_source: string;
  data_checked_at: string | null;
} {
  return { data_source: state.source, data_checked_at: state.updatedAt };
}
