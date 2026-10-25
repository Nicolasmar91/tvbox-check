import { validateDatabase } from "@tvbox-check/core";
import type { Case, Database, Soc, Source } from "@tvbox-check/core";
import socs from "../../../../data/socs.json";
import cases from "../../../../data/cases.json";
import models from "../../../../data/models.json";
import sources from "../../../../data/sources.json";

const result = validateDatabase({ socs, cases, models, sources });
if (!result.ok || !result.db) {
  throw new Error(`Base de données invalide :\n${result.errors.join("\n")}`);
}

export const db: Database = result.db;

const sourceMap = new Map<string, Source>(db.sources.map((s) => [s.id, s]));
export const getSources = (ids: readonly string[]): Source[] =>
  ids.flatMap((id) => {
    const s = sourceMap.get(id);
    return s ? [s] : [];
  });

export const socName = (id: string | null): string => {
  if (!id) return "inconnu";
  const s = db.socs.find((x) => x.id === id);
  return s ? `${s.vendor} ${s.name}` : id;
};

export const casesForSoc = (soc: Soc): Case[] =>
  db.cases.filter((c) => c.marketed.soc === soc.id || c.observed.soc === soc.id);
