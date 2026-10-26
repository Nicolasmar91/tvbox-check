/** Langues de l'interface et des messages du moteur. */
export type Locale = "fr" | "en";
export const LOCALES: readonly Locale[] = ["fr", "en"];

/** Messages du moteur : chaque langue doit fournir exactement ces clés. */
export interface Messages {
  noCriteria: string;
  socUnknown: (soc: string) => string;
  dataMissing: (field: string, soc: string) => string;
  modelSocKnown: (model: string, soc: string) => string;
  modelSocReported: (model: string, soc: string) => string;
  modelSocUnusual: (model: string, soc: string, known: string) => string;
  modelSpecsUnlisted: (model: string, ram: number, known: string) => string;
  hypothesis: (field: string, soc: string) => string;
  ramPlausible: (claimed: number, max: number) => string;
  ramImpossible: (claimed: number, max: number) => string;
  ramSuspect: (claimed: number, max: number) => string;
  ethernetPlausible: string;
  ethernetImpossible: (max: number) => string;
  ethernetSuspect: (max: number) => string;
  videoPlausible: (claimed: string, max: string) => string;
  videoImpossible: (claimed: string, max: string) => string;
  videoSuspect: (claimed: string, max: string) => string;
  knownCase: (name: string, summary: string) => string;
  fieldRam: string;
  fieldEthernet: string;
  fieldVideo: string;
}
