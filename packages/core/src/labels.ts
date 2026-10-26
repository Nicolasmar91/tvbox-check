import type { Locale } from "./messages.ts";
import type { Basis, Case, Status } from "./schemas.ts";
import type { Criterion, Verdict } from "./verdict.ts";

/**
 * Libellés courts réutilisables hors du site (connecteur MCP, futurs outils).
 * Le site garde ses propres textes dans `apps/web/src/i18n` ; ici, chaque langue doit fournir
 * exactement les mêmes clés (le type `Labels` l'impose).
 */
export interface Labels {
  verdict: Record<Verdict, string>;
  status: Record<Status, string>;
  basis: Record<Basis, string>;
  criterion: Record<Criterion, string>;
  confidence: Record<Case["observed"]["confidence"], string>;
  caseType: Record<Case["type"], string>;
  evidence: { official: string; corroborated: string; single: string };
  variantKind: { official: string; reported: string };
  unknown: string;
  /** Phrase de synthèse du verdict global. */
  summary: Record<Verdict, string>;
  plausibleCaveat: string;
}

const fr: Labels = {
  verdict: {
    impossible: "Impossible",
    suspect: "Suspect",
    unknown: "Inconnu",
    plausible: "Plausible",
  },
  status: { verified: "Vérifié", unverified: "Non vérifié" },
  basis: {
    datasheet: "Datasheet constructeur",
    vendor: "Fiche constructeur",
    corroborated: "Recoupée par plusieurs sources indépendantes",
    community: "Retours de la communauté",
    hypothesis: "Hypothèse non sourcée",
  },
  criterion: {
    soc: "SoC",
    ram: "RAM",
    ethernet: "Ethernet",
    video: "Vidéo",
    knownCase: "Cas signalé",
    modelSoc: "SoC du modèle",
    modelSpecs: "Configurations du modèle",
  },
  confidence: { confirmed: "Confirmé", probable: "Probable", reported: "Signalé" },
  caseType: {
    "inflated-specs": "Specs gonflées",
    "wrong-soc": "SoC différent de l'annonce",
    "impossible-claim": "Annonce impossible",
    relabeled: "Boîtier réétiqueté",
  },
  evidence: {
    official: "Source constructeur",
    corroborated: "Recoupé (au moins 2 sources indépendantes)",
    single: "Une seule source",
  },
  variantKind: { official: "Révision officielle", reported: "Signalé sous ce nom (non officiel)" },
  unknown: "Inconnu",
  summary: {
    impossible:
      "Au moins une spec annoncée est impossible pour ce SoC (donnée vérifiée : datasheet ou sources recoupées).",
    suspect: "Au moins une spec annoncée est suspecte ou correspond à un cas déjà signalé.",
    unknown: "Les données connues ne permettent pas de conclure.",
    plausible: "Aucune impossibilité détectée avec les données connues.",
  },
  plausibleCaveat:
    "Plausible ne veut pas dire authentique : seule l'ouverture du boîtier et la lecture des puces le prouvent.",
};

const en: Labels = {
  verdict: {
    impossible: "Impossible",
    suspect: "Suspect",
    unknown: "Unknown",
    plausible: "Plausible",
  },
  status: { verified: "Verified", unverified: "Unverified" },
  basis: {
    datasheet: "Manufacturer datasheet",
    vendor: "Manufacturer product page",
    corroborated: "Cross-checked by several independent sources",
    community: "Community reports",
    hypothesis: "Unsourced hypothesis",
  },
  criterion: {
    soc: "SoC",
    ram: "RAM",
    ethernet: "Ethernet",
    video: "Video",
    knownCase: "Reported case",
    modelSoc: "Model's SoC",
    modelSpecs: "Model configurations",
  },
  confidence: { confirmed: "Confirmed", probable: "Probable", reported: "Reported" },
  caseType: {
    "inflated-specs": "Inflated specs",
    "wrong-soc": "SoC differs from the advertised one",
    "impossible-claim": "Impossible claim",
    relabeled: "Relabelled device",
  },
  evidence: {
    official: "Manufacturer source",
    corroborated: "Cross-checked (at least 2 independent sources)",
    single: "Single source",
  },
  variantKind: { official: "Official revision", reported: "Reported under this name (unofficial)" },
  unknown: "Unknown",
  summary: {
    impossible:
      "At least one advertised spec is impossible for this SoC (verified data: datasheet or cross-checked sources).",
    suspect: "At least one advertised spec is suspect or matches an already reported case.",
    unknown: "The known data does not allow a conclusion.",
    plausible: "No impossibility detected with the known data.",
  },
  plausibleCaveat:
    "Plausible does not mean genuine: only opening the case and reading the chips proves it.",
};

export const labels: Record<Locale, Labels> = { fr, en };
