import { messagesFr as m } from "./messages.fr.ts";
import type { Database, Soc, Status, VideoLevel } from "./schemas.ts";
import { worstVerdict } from "./verdict.ts";
import type { CheckInput, CheckResult, CriterionResult, Verdict } from "./verdict.ts";

const VIDEO_ORDER: readonly VideoLevel[] = ["1080p", "4K", "6K", "8K"];

/** Minuscules, sans accents, uniquement lettres et chiffres. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function findSoc(db: Database, query: string): Soc | undefined {
  const q = normalizeName(query);
  return db.socs.find(
    (s) => normalizeName(s.id) === q || s.aliases.some((a) => normalizeName(a) === q),
  );
}

/** `impossible` seulement sur donnée vérifiée ; sinon `suspect`. */
function breach(status: Status): Verdict {
  return status === "verified" ? "impossible" : "suspect";
}

export function evaluate(input: CheckInput, db: Database): CheckResult {
  const criteria: CriterionResult[] = [];
  const socQuery = input.soc?.trim();
  const modelQuery = input.modelName?.trim();

  if (modelQuery) {
    const q = normalizeName(modelQuery);
    const found = q ? db.cases.find((c) => normalizeName(c.marketed_name) === q) : undefined;
    if (found) {
      criteria.push({
        criterion: "knownCase",
        verdict: "suspect",
        message: m.knownCase(found.marketed_name, found.summary_fr),
        sources: found.sources,
        case: found,
      });
    }
  }

  if (socQuery) {
    const soc = findSoc(db, socQuery);
    if (!soc) {
      criteria.push({
        criterion: "soc",
        verdict: "unknown",
        message: m.socUnknown(socQuery),
        sources: [],
      });
    } else {
      checkRam(input, soc, criteria);
      checkEthernet(input, soc, criteria);
      checkVideo(input, soc, criteria);
    }
  }

  if (criteria.length === 0) {
    return { overall: "unknown", criteria };
  }
  return { overall: worstVerdict(criteria.map((c) => c.verdict)), criteria };
}

function missing(
  criterion: CriterionResult["criterion"],
  field: string,
  soc: Soc,
): CriterionResult {
  return {
    criterion,
    verdict: "unknown",
    message: m.dataMissing(field, soc.name),
    sources: [],
  };
}

function checkRam(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  if (input.ramGb === undefined) return;
  const max = soc.ram_max_gb;
  if (!max) return void out.push(missing("ram", "RAM maximale", soc));
  const bad = input.ramGb > max.value;
  out.push({
    criterion: "ram",
    verdict: bad ? breach(max.status) : "plausible",
    message: !bad
      ? m.ramPlausible(input.ramGb, max.value)
      : max.status === "verified"
        ? m.ramImpossible(input.ramGb, max.value)
        : m.ramSuspect(input.ramGb, max.value),
    claimed: input.ramGb,
    limit: max.value,
    status: max.status,
    sources: max.sources,
  });
}

function checkEthernet(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  if (input.ethernet === undefined) return;
  const max = soc.ethernet_max_mbps;
  if (!max) return void out.push(missing("ethernet", "débit Ethernet maximal", soc));
  const bad = input.ethernet === "1G" && max.value <= 100;
  out.push({
    criterion: "ethernet",
    verdict: bad ? breach(max.status) : "plausible",
    message: !bad
      ? m.ethernetPlausible
      : max.status === "verified"
        ? m.ethernetImpossible(max.value)
        : m.ethernetSuspect(max.value),
    claimed: input.ethernet,
    limit: max.value,
    status: max.status,
    sources: max.sources,
  });
}

function checkVideo(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  if (input.videoMax === undefined) return;
  const max = soc.video_max_decode;
  if (!max) return void out.push(missing("video", "décodage vidéo maximal", soc));
  const bad = VIDEO_ORDER.indexOf(input.videoMax) > VIDEO_ORDER.indexOf(max.value);
  out.push({
    criterion: "video",
    verdict: bad ? breach(max.status) : "plausible",
    message: !bad
      ? m.videoPlausible(input.videoMax, max.value)
      : max.status === "verified"
        ? m.videoImpossible(input.videoMax, max.value)
        : m.videoSuspect(input.videoMax, max.value),
    claimed: input.videoMax,
    limit: max.value,
    status: max.status,
    sources: max.sources,
  });
}
