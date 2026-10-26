import type { Messages } from "./messages.ts";

/** Engine messages in English. Must stay in step with messages.fr.ts (same keys, same meaning). */
export const messagesEn: Messages = {
  noCriteria: "No criteria provided: unable to give a verdict.",
  socUnknown: (soc) => `The SoC "${soc}" is not in the database. You can help by adding it.`,
  dataMissing: (field, soc) => `The value "${field}" is not known for the ${soc} SoC.`,
  modelSocKnown: (model, soc) => `The ${soc} SoC is one of those listed for "${model}": plausible.`,
  modelSocReported: (model, soc) =>
    `The ${soc} SoC has already been reported under the name "${model}" in place of the advertised chip: check the chips.`,
  modelSocUnusual: (model, soc, known) =>
    `The ${soc} SoC is not listed for "${model}" (known: ${known}). It may be a recent revision or a discrepancy: check the chips.`,
  modelSpecsUnlisted: (model, ram, known) =>
    `${ram} GB of RAM is not among the configurations listed for "${model}" with this SoC (${known} GB). The catalogue may be incomplete.`,
  hypothesis: (field, soc) =>
    `The expected value for "${field}" (${soc} SoC) has no source yet: no verdict.`,
  ramPlausible: (claimed, max) =>
    `${claimed} GB of RAM advertised, the SoC supports up to ${max} GB: plausible.`,
  ramImpossible: (claimed, max) =>
    `${claimed} GB of RAM advertised but the SoC is limited to ${max} GB: impossible (verified data).`,
  ramSuspect: (claimed, max) =>
    `${claimed} GB of RAM advertised but the SoC would be limited to ${max} GB: suspect (unverified data).`,
  ethernetPlausible: "Advertised Ethernet is compatible with the SoC: plausible.",
  ethernetImpossible: (max) =>
    `Gigabit advertised but the SoC is limited to ${max} Mbit/s: impossible (verified data).`,
  ethernetSuspect: (max) =>
    `Gigabit advertised but the SoC would be limited to ${max} Mbit/s: suspect (unverified data).`,
  videoPlausible: (claimed, max) =>
    `${claimed} video advertised, the SoC decodes up to ${max}: plausible.`,
  videoImpossible: (claimed, max) =>
    `${claimed} video advertised but the SoC decodes ${max} at best: impossible (verified data).`,
  videoSuspect: (claimed, max) =>
    `${claimed} video advertised but the SoC would decode ${max} at best: suspect (unverified data).`,
  knownCase: (name, summary) => `Reported case for "${name}": ${summary}`,
  fieldRam: "maximum RAM",
  fieldEthernet: "maximum Ethernet speed",
  fieldVideo: "maximum video decoding",
};
