import {
  evaluate,
  findModel,
  findSoc,
  labels,
  localized,
  modelsForSoc,
  normalizeName,
  registrableDomain,
  searchDatabase,
} from "@tvbox-check/core";
import type {
  Basis,
  CheckInput,
  Database,
  Locale,
  Model,
  ModelVariant,
  Source,
  Status,
} from "@tvbox-check/core";

type Sourced<T> = { value: T; status: Status; basis: Basis; sources: string[] } | null;

/** Résultat d'un outil : un texte lisible et la même information sous forme structurée. */
export interface ToolOutput {
  text: string;
  data: Record<string, unknown>;
  /** Vrai si la demande n'a pas pu être satisfaite (ex. SoC introuvable). */
  notFound?: boolean;
}

interface SourceRef {
  id: string;
  title: string;
  url: string;
  type: Source["type"];
}

const sourceRefs = (db: Database, ids: readonly string[], locale: Locale): SourceRef[] =>
  ids.flatMap((id) => {
    const s = db.sources.find((x) => x.id === id);
    if (!s) return [];
    const title = (locale === "en" && s.title_en) || s.title;
    return [{ id: s.id, title, url: s.url, type: s.type }];
  });

const formatSources = (refs: SourceRef[]): string =>
  refs.map((r) => `  - ${r.title} <${r.url}>`).join("\n");

/** Niveau de confirmation d'une révision de modèle, déduit de ses sources. */
function variantEvidence(db: Database, v: ModelVariant): "official" | "corroborated" | "single" {
  const list = v.sources.flatMap((id) => db.sources.filter((s) => s.id === id));
  if (list.some((s) => s.type === "datasheet" || s.type === "vendor")) return "official";
  const domains = new Set(list.map((s) => registrableDomain(s.url)));
  return domains.size >= 2 ? "corroborated" : "single";
}

export interface CheckBoxArgs {
  model?: string;
  soc?: string;
  ram_gb?: number;
  storage_gb?: number;
  ethernet?: "100M" | "1G" | "none";
  video_max?: "1080p" | "4K" | "6K" | "8K";
}

export function checkBox(db: Database, args: CheckBoxArgs, locale: Locale): ToolOutput {
  const input: CheckInput = {};
  if (args.model) input.modelName = args.model;
  if (args.soc) input.soc = args.soc;
  if (args.ram_gb !== undefined) input.ramGb = args.ram_gb;
  if (args.storage_gb !== undefined) input.storageGb = args.storage_gb;
  if (args.ethernet) input.ethernet = args.ethernet;
  if (args.video_max) input.videoMax = args.video_max;

  const L = labels[locale];
  const result = evaluate(input, db, locale);
  const criteria = result.criteria.map((c) => ({
    criterion: c.criterion,
    criterion_label: L.criterion[c.criterion],
    verdict: c.verdict,
    verdict_label: L.verdict[c.verdict],
    message: c.message,
    claimed: c.claimed ?? null,
    limit: c.limit ?? null,
    status: c.status ?? null,
    basis: c.basis ?? null,
    case_id: c.case?.id ?? null,
    sources: sourceRefs(db, c.sources, locale),
  }));

  const lines = [
    `${L.verdict[result.overall]} — ${L.summary[result.overall]}`,
    ...(result.overall === "plausible" ? [L.plausibleCaveat] : []),
    "",
    ...criteria.flatMap((c) => [
      `- ${c.criterion_label} · ${c.verdict_label}: ${c.message}` +
        (c.status && c.basis ? ` [${L.status[c.status]}; ${L.basis[c.basis]}]` : ""),
      ...(c.sources.length > 0 ? [formatSources(c.sources)] : []),
    ]),
  ];
  if (criteria.length === 0) lines.push(L.summary.unknown);

  return {
    text: lines.join("\n"),
    data: { overall: result.overall, overall_label: L.verdict[result.overall], criteria },
  };
}

const notFoundHint = (db: Database, query: string, locale: Locale) =>
  searchDatabase(db, query, locale, 5).map((h) => ({ type: h.type, id: h.id, title: h.title }));

export function getSoc(db: Database, args: { soc: string }, locale: Locale): ToolOutput {
  const L = labels[locale];
  const soc = findSoc(db, args.soc);
  if (!soc) {
    const suggestions = notFoundHint(db, args.soc, locale);
    return {
      notFound: true,
      text:
        (locale === "fr" ? `SoC introuvable : « ${args.soc} ».` : `SoC not found: "${args.soc}".`) +
        (suggestions.length > 0
          ? `\n${locale === "fr" ? "Résultats proches" : "Close matches"}: ${suggestions.map((s) => `${s.title} (${s.type}:${s.id})`).join(", ")}`
          : ""),
      data: { found: false, suggestions },
    };
  }

  const field = <T>(f: Sourced<T>) =>
    f
      ? {
          value: f.value,
          status: f.status,
          status_label: L.status[f.status],
          basis: f.basis,
          basis_label: L.basis[f.basis],
          sources: sourceRefs(db, f.sources, locale),
        }
      : null;

  const fields = {
    ram_max_gb: field(soc.ram_max_gb),
    ram_types: field(soc.ram_types),
    ethernet_max_mbps: field(soc.ethernet_max_mbps),
    video_max_decode: field(soc.video_max_decode),
  };
  const findings = soc.community_findings.map((f) => ({
    topic: f.topic,
    summary: localized(f, "summary", locale) ?? "",
    sources: sourceRefs(db, f.sources, locale),
  }));
  const boxes = modelsForSoc(db, soc.id).map((m) => ({ id: m.id, name: m.name }));
  const notes = localized(soc, "notes", locale);

  const show = (label: string, f: ReturnType<typeof field>) =>
    `- ${label}: ${f ? `${Array.isArray(f.value) ? f.value.join(", ") : String(f.value)} [${f.status_label}; ${f.basis_label}]` : L.unknown}`;
  const lines = [
    `${soc.vendor} ${soc.name}${soc.cores ? ` — ${soc.cores}${soc.arch ? ` × ${soc.arch}` : ""}` : ""}`,
    show(locale === "fr" ? "RAM maximale (Go)" : "Maximum RAM (GB)", fields.ram_max_gb),
    show(locale === "fr" ? "Types de RAM" : "RAM types", fields.ram_types),
    show(
      locale === "fr" ? "Ethernet maximal (Mbit/s)" : "Maximum Ethernet (Mbit/s)",
      fields.ethernet_max_mbps,
    ),
    show(
      locale === "fr" ? "Décodage vidéo maximal" : "Maximum video decoding",
      fields.video_max_decode,
    ),
    ...(notes ? ["", notes] : []),
    ...(findings.length > 0
      ? [
          "",
          locale === "fr" ? "Constats de la communauté :" : "Community findings:",
          ...findings.map((f) => `- [${f.topic}] ${f.summary}`),
        ]
      : []),
    ...(boxes.length > 0
      ? [
          "",
          `${locale === "fr" ? "Box répertoriées" : "Listed boxes"}: ${boxes.map((b) => b.name).join(", ")}`,
        ]
      : []),
  ];

  return {
    text: lines.join("\n"),
    data: {
      found: true,
      id: soc.id,
      vendor: soc.vendor,
      name: soc.name,
      cores: soc.cores,
      arch: soc.arch,
      ...fields,
      notes,
      community_findings: findings,
      boxes,
    },
  };
}

export function getModel(db: Database, args: { model: string }, locale: Locale): ToolOutput {
  const L = labels[locale];
  const model: Model | undefined = findModel(db, args.model);
  const q = normalizeName(args.model);
  const cases = db.cases
    .filter(
      (c) =>
        normalizeName(c.marketed_name) === q ||
        (model && normalizeName(c.marketed_name) === normalizeName(model.name)),
    )
    .map((c) => ({
      id: c.id,
      name: c.marketed_name,
      type: c.type,
      type_label: L.caseType[c.type],
      confidence: c.observed.confidence,
      confidence_label: L.confidence[c.observed.confidence],
      summary: localized(c, "summary", locale) ?? "",
      sources: sourceRefs(db, c.sources, locale),
    }));

  if (!model) {
    const suggestions = notFoundHint(db, args.model, locale);
    return {
      notFound: cases.length === 0,
      text:
        (locale === "fr"
          ? `Modèle absent du catalogue : « ${args.model} ».`
          : `Model not in the catalogue: "${args.model}".`) +
        (cases.length > 0
          ? `\n${cases.map((c) => `- ${c.type_label} (${c.confidence_label}): ${c.summary}`).join("\n")}`
          : "") +
        (suggestions.length > 0
          ? `\n${locale === "fr" ? "Résultats proches" : "Close matches"}: ${suggestions.map((s) => `${s.title} (${s.type}:${s.id})`).join(", ")}`
          : ""),
      data: { found: false, cases, suggestions },
    };
  }

  const variants = model.variants.map((v) => {
    const evidence = variantEvidence(db, v);
    const soc = db.socs.find((s) => s.id === v.soc);
    return {
      soc_id: v.soc,
      soc: soc ? `${soc.vendor} ${soc.name}` : v.soc,
      kind: v.kind,
      kind_label: L.variantKind[v.kind],
      evidence,
      evidence_label: L.evidence[evidence],
      year: v.year,
      ram_gb: v.ram_gb,
      storage_gb: v.storage_gb,
      note: localized(v, "note", locale),
      sources: sourceRefs(db, v.sources, locale),
    };
  });
  const notes = localized(model, "notes", locale);

  const lines = [
    `${model.name}${model.brand ? ` (${model.brand})` : ""}`,
    locale === "fr"
      ? "Un même nom de modèle peut changer de SoC d'une révision à l'autre : vérifiez la révision exacte."
      : "The same model name can change SoC between revisions: check the exact revision.",
    "",
    ...variants.map(
      (v) =>
        `- ${v.soc} · ${v.kind_label} · ${v.evidence_label}` +
        (v.year ? ` · ${v.year}` : "") +
        (v.ram_gb ? ` · RAM ${v.ram_gb.join("/")} ${locale === "fr" ? "Go" : "GB"}` : "") +
        (v.note ? ` — ${v.note}` : ""),
    ),
    ...(notes ? ["", notes] : []),
    ...(cases.length > 0
      ? [
          "",
          locale === "fr" ? "Cas signalés :" : "Reported cases:",
          ...cases.map((c) => `- ${c.type_label} (${c.confidence_label}): ${c.summary}`),
        ]
      : []),
  ];

  return {
    text: lines.join("\n"),
    data: {
      found: true,
      id: model.id,
      name: model.name,
      brand: model.brand,
      variants,
      notes,
      cases,
    },
  };
}

export function searchTool(
  db: Database,
  args: { query: string; limit?: number },
  locale: Locale,
): ToolOutput {
  const hits = searchDatabase(db, args.query, locale, args.limit ?? 10);
  const text =
    hits.length === 0
      ? locale === "fr"
        ? `Aucun résultat pour « ${args.query} ».`
        : `No results for "${args.query}".`
      : hits.map((h) => `- ${h.title} (${h.type}:${h.id})`).join("\n");
  return { text, data: { query: args.query, results: hits } };
}
