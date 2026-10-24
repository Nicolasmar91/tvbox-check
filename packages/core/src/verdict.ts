import type { Case, Status, VideoLevel } from "./schemas.ts";

export type Verdict = "impossible" | "suspect" | "unknown" | "plausible";

/** Du plus grave au moins grave. */
const SEVERITY: Record<Verdict, number> = { impossible: 3, suspect: 2, unknown: 1, plausible: 0 };

export function worstVerdict(verdicts: readonly Verdict[]): Verdict {
  let worst: Verdict = "plausible";
  for (const v of verdicts) if (SEVERITY[v] > SEVERITY[worst]) worst = v;
  return worst;
}

export type Criterion = "soc" | "ram" | "ethernet" | "video" | "knownCase";

export interface CriterionResult {
  criterion: Criterion;
  verdict: Verdict;
  /** Message en français destiné à l'utilisateur. */
  message: string;
  /** Valeurs comparées (annoncée vs limite). */
  claimed?: string | number;
  limit?: string | number;
  /** Statut de la donnée utilisée pour la comparaison. */
  status?: Status;
  sources: string[];
  /** Cas documenté associé (critère `knownCase`). */
  case?: Case;
}

export interface CheckInput {
  /** Identifiant ou alias du SoC. */
  soc?: string;
  modelName?: string;
  ramGb?: number;
  storageGb?: number;
  ethernet?: "100M" | "1G" | "none";
  videoMax?: Exclude<VideoLevel, "1080p"> | "1080p";
}

export interface CheckResult {
  overall: Verdict;
  criteria: CriterionResult[];
}
