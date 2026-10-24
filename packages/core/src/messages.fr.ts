/** Chaînes françaises du moteur, centralisées pour faciliter la traduction. */
export const messagesFr = {
  noCriteria: "Aucun critère renseigné : impossible de se prononcer.",
  socUnknown: (soc: string) =>
    `Le SoC « ${soc} » n'est pas dans la base. Vous pouvez contribuer en l'ajoutant.`,
  dataMissing: (field: string, soc: string) =>
    `La donnée « ${field} » n'est pas connue pour le SoC ${soc}.`,
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
} as const;
