import type { Messages } from "./messages.ts";

/** Messages français du moteur. */
export const messagesFr: Messages = {
  noCriteria: "Aucun critère renseigné : impossible de se prononcer.",
  socUnknown: (soc: string) =>
    `Le SoC « ${soc} » n'est pas dans la base. Vous pouvez contribuer en l'ajoutant.`,
  dataMissing: (field: string, soc: string) =>
    `La donnée « ${field} » n'est pas connue pour le SoC ${soc}.`,
  modelSocKnown: (model: string, soc: string) =>
    `Le SoC ${soc} fait partie de ceux répertoriés pour « ${model} » : plausible.`,
  modelSocReported: (model: string, soc: string) =>
    `Le SoC ${soc} a déjà été signalé sous le nom « ${model} » en remplacement de la puce annoncée : à vérifier sur les puces.`,
  modelSocUnusual: (model: string, soc: string, known: string) =>
    `Le SoC ${soc} n'est pas répertorié pour « ${model} » (connus : ${known}). Cela peut être une révision récente ou un écart : à vérifier sur les puces.`,
  modelSpecsUnlisted: (model: string, ram: number, known: string) =>
    `${ram} Go de RAM ne figurent pas parmi les configurations répertoriées pour « ${model} » avec ce SoC (${known} Go). Le catalogue peut être incomplet.`,
  hypothesis: (field: string, soc: string) =>
    `La valeur attendue pour « ${field} » (SoC ${soc}) n'est pas encore sourcée : pas de verdict.`,
  ramPlausible: (claimed: number, max: number) =>
    `${claimed} Go de RAM annoncés, le SoC en gère jusqu'à ${max} Go : plausible.`,
  ramImpossible: (claimed: number, max: number) =>
    `${claimed} Go de RAM annoncés alors que le SoC est limité à ${max} Go : impossible (donnée vérifiée).`,
  ramSuspect: (claimed: number, max: number) =>
    `${claimed} Go de RAM annoncés alors que le SoC serait limité à ${max} Go : suspect (donnée non vérifiée).`,
  ethernetPlausible: "Ethernet annoncé compatible avec le SoC : plausible.",
  ethernetImpossible: (max: number) =>
    `Gigabit annoncé alors que le SoC est limité à ${max} Mbit/s : impossible (donnée vérifiée).`,
  ethernetSuspect: (max: number) =>
    `Gigabit annoncé alors que le SoC serait limité à ${max} Mbit/s : suspect (donnée non vérifiée).`,
  videoPlausible: (claimed: string, max: string) =>
    `Vidéo ${claimed} annoncée, le SoC décode jusqu'à ${max} : plausible.`,
  videoImpossible: (claimed: string, max: string) =>
    `Vidéo ${claimed} annoncée alors que le SoC décode au mieux ${max} : impossible (donnée vérifiée).`,
  videoSuspect: (claimed: string, max: string) =>
    `Vidéo ${claimed} annoncée alors que le SoC décoderait au mieux ${max} : suspect (donnée non vérifiée).`,
  knownCase: (name: string, summary: string) => `Cas signalé pour « ${name} » : ${summary}`,
  fieldRam: "RAM maximale",
  fieldEthernet: "débit Ethernet maximal",
  fieldVideo: "décodage vidéo maximal",
};
