import { validateDatabase } from "@tvbox-check/core";
import type { Database } from "@tvbox-check/core";
import cases from "../../../data/cases.json";
import models from "../../../data/models.json";
import socs from "../../../data/socs.json";
import sources from "../../../data/sources.json";

/** Valide une base : on n'utilise jamais de données qui ne respectent pas le schéma. */
export function parseDatabase(raw: unknown): Database {
  const result = validateDatabase(raw);
  if (!result.ok || !result.db) {
    throw new Error(`Base de données invalide :\n${result.errors.slice(0, 10).join("\n")}`);
  }
  return result.db;
}

/** Base embarquée dans le paquet au moment du build (aucun accès réseau). */
export function loadBundledDatabase(): Database {
  return parseDatabase({ socs, cases, models, sources });
}

/**
 * Mise à jour facultative : si `TVBOX_CHECK_DB_URL` est définie, la base publiée sur le site est
 * téléchargée, validée par le schéma, puis utilisée. En cas d'échec (réseau, données invalides),
 * la base embarquée est conservée.
 */
export async function loadDatabase(
  env: Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ db: Database; source: "bundled" | "remote"; warning?: string }> {
  const bundled = loadBundledDatabase();
  const url = env.TVBOX_CHECK_DB_URL;
  if (!url) return { db: bundled, source: "bundled" };
  try {
    if (!/^https:\/\//.test(url)) throw new Error("l'adresse doit commencer par https://");
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { db: parseDatabase(await response.json()), source: "remote" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { db: bundled, source: "bundled", warning: `mise à jour distante ignorée : ${reason}` };
  }
}
