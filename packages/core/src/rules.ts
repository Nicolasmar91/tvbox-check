import { messagesFr as m } from "./messages.fr.ts";
import type { Basis, Database, Model, Soc, Status, VideoLevel } from "./schemas.ts";
import { worstVerdict } from "./verdict.ts";
import type { CheckInput, CheckResult, Criterion, CriterionResult, Verdict } from "./verdict.ts";

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

/** Modèle du catalogue correspondant à un nom (insensible à la casse, aux espaces et à la ponctuation). */
export function findModel(db: Database, query: string): Model | undefined {
  const q = normalizeName(query);
  if (!q) return undefined;
  return db.models.find(
    (m) => normalizeName(m.name) === q || m.aliases.some((a) => normalizeName(a) === q),
  );
}

/** SoC répertoriés pour un modèle, sans doublon, dans l'ordre du catalogue. */
export function socsForModel(db: Database, model: Model): Soc[] {
  const ids = [...new Set(model.variants.map((v) => v.soc))];
  return ids.flatMap((id) => db.socs.filter((s) => s.id === id));
}

/** Modèles du catalogue dont au moins une révision utilise ce SoC. */
export function modelsForSoc(db: Database, socId: string): Model[] {
  return db.models.filter((m) => m.variants.some((v) => v.soc === socId));
}

/** `impossible` seulement sur donnée vérifiée ; sinon `suspect`. */
function breach(status: Status): Verdict {
  return status === "verified" ? "impossible" : "suspect";
}

export function evaluate(input: CheckInput, db: Database): CheckResult {
  const criteria: CriterionResult[] = [];
  const socQuery = input.soc?.trim();
  const modelQuery = input.modelName?.trim();
  const model = modelQuery ? findModel(db, modelQuery) : undefined;

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
      if (model) {
        checkModelSoc(db, model, soc, criteria);
        checkModelSpecs(input, model, soc, criteria);
      }
      checkRam(input, soc, criteria);
      checkEthernet(input, soc, criteria);
      checkVideo(input, soc, criteria);
    }
  }

  if (criteria.length === 0) return { overall: "unknown", criteria };
  return { overall: worstVerdict(criteria.map((c) => c.verdict)), criteria };
}

interface Sourced<T> {
  value: T;
  status: Status;
  basis: Basis;
  sources: string[];
}

interface Comparison<T> {
  criterion: Criterion;
  field: string;
  claimed: string | number;
  limit: Sourced<T> | null;
  exceeds: (limit: T) => boolean;
  messages: {
    plausible: string;
    impossible: string;
    suspect: string;
  };
}

/**
 * Compare une valeur annoncée à une limite sourcée :
 * - limite inconnue (`null`) ou simple hypothèse non sourcée : `unknown` ;
 * - limite dépassée : `impossible` si vérifiée (datasheet/fiche constructeur), sinon `suspect` ;
 * - sinon : `plausible`.
 */
function compare<T extends string | number>(soc: Soc, c: Comparison<T>): CriterionResult {
  const { limit } = c;
  if (!limit) {
    return {
      criterion: c.criterion,
      verdict: "unknown",
      message: m.dataMissing(c.field, soc.name),
      sources: [],
    };
  }
  const base = {
    criterion: c.criterion,
    claimed: c.claimed,
    limit: limit.value as string | number,
    status: limit.status,
    basis: limit.basis,
    sources: limit.sources,
  };
  if (limit.basis === "hypothesis") {
    return { ...base, verdict: "unknown", message: m.hypothesis(c.field, soc.name) };
  }
  if (!c.exceeds(limit.value)) {
    return { ...base, verdict: "plausible", message: c.messages.plausible };
  }
  return {
    ...base,
    verdict: breach(limit.status),
    message: limit.status === "verified" ? c.messages.impossible : c.messages.suspect,
  };
}

function checkRam(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  const claimed = input.ramGb;
  if (claimed === undefined) return;
  const max = soc.ram_max_gb?.value ?? 0;
  out.push(
    compare(soc, {
      criterion: "ram",
      field: "RAM maximale",
      claimed,
      limit: soc.ram_max_gb,
      exceeds: (limit) => claimed > limit,
      messages: {
        plausible: m.ramPlausible(claimed, max),
        impossible: m.ramImpossible(claimed, max),
        suspect: m.ramSuspect(claimed, max),
      },
    }),
  );
}

function checkEthernet(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  const claimed = input.ethernet;
  if (claimed === undefined) return;
  const max = soc.ethernet_max_mbps?.value ?? 0;
  out.push(
    compare(soc, {
      criterion: "ethernet",
      field: "débit Ethernet maximal",
      claimed,
      limit: soc.ethernet_max_mbps,
      exceeds: (limit) => claimed === "1G" && limit <= 100,
      messages: {
        plausible: m.ethernetPlausible,
        impossible: m.ethernetImpossible(max),
        suspect: m.ethernetSuspect(max),
      },
    }),
  );
}

function checkVideo(input: CheckInput, soc: Soc, out: CriterionResult[]): void {
  const claimed = input.videoMax;
  if (claimed === undefined) return;
  const max = soc.video_max_decode?.value ?? "";
  out.push(
    compare(soc, {
      criterion: "video",
      field: "décodage vidéo maximal",
      claimed,
      limit: soc.video_max_decode,
      exceeds: (limit) => VIDEO_ORDER.indexOf(claimed) > VIDEO_ORDER.indexOf(limit),
      messages: {
        plausible: m.videoPlausible(claimed, max),
        impossible: m.videoImpossible(claimed, max),
        suspect: m.videoSuspect(claimed, max),
      },
    }),
  );
}

const socLabel = (s: Soc) => `${s.vendor} ${s.name}`;

/**
 * Le SoC saisi est-il l'un de ceux répertoriés pour ce modèle ? Un écart reste `suspect` au
 * maximum : un fabricant change parfois de puce sans changer de nom.
 */
function checkModelSoc(db: Database, model: Model, soc: Soc, out: CriterionResult[]): void {
  const known = socsForModel(db, model);
  const sources = [...new Set(model.variants.flatMap((v) => v.sources))];
  if (known.some((s) => s.id === soc.id)) {
    const own = model.variants.filter((v) => v.soc === soc.id).flatMap((v) => v.sources);
    out.push({
      criterion: "modelSoc",
      verdict: "plausible",
      message: m.modelSocKnown(model.name, socLabel(soc)),
      sources: [...new Set(own)],
    });
    return;
  }
  out.push({
    criterion: "modelSoc",
    verdict: "suspect",
    message: m.modelSocUnusual(model.name, socLabel(soc), known.map(socLabel).join(", ")),
    claimed: socLabel(soc),
    limit: known.map(socLabel).join(", "),
    sources,
  });
}

/** RAM annoncée supérieure aux configurations répertoriées pour ce modèle avec ce SoC. */
function checkModelSpecs(input: CheckInput, model: Model, soc: Soc, out: CriterionResult[]): void {
  const claimed = input.ramGb;
  if (claimed === undefined) return;
  const variants = model.variants.filter((v) => v.soc === soc.id && v.ram_gb !== null);
  const sizes = [...new Set(variants.flatMap((v) => v.ram_gb ?? []))].sort((a, b) => a - b);
  if (sizes.length === 0 || claimed <= sizes[sizes.length - 1]!) return;
  out.push({
    criterion: "modelSpecs",
    verdict: "unknown",
    message: m.modelSpecsUnlisted(model.name, claimed, sizes.join(", ")),
    claimed,
    limit: sizes.join(", "),
    sources: [...new Set(variants.flatMap((v) => v.sources))],
  });
}
