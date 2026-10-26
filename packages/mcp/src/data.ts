import { validateDatabase } from "@tvbox-check/core";
import type { Database } from "@tvbox-check/core";
import cases from "../../../data/cases.json";
import models from "../../../data/models.json";
import socs from "../../../data/socs.json";
import sources from "../../../data/sources.json";

/** Adresse de la base publiée par le site (licence CC BY 4.0). */
export const DEFAULT_DB_URL = "https://tvbox-check.nm-labs.dev/data/db.json";
/** Intervalle entre deux vérifications pendant la vie du processus. */
export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 8 * 1024 * 1024;

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

export interface DatabaseState {
  db: Database;
  source: "online" | "bundled";
  /** Date (ISO) de la dernière base en ligne appliquée ; `null` pour la copie embarquée. */
  updatedAt: string | null;
}

export interface ProviderOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  /** Journal (stderr : stdout est réservé au protocole MCP). */
  log?: (message: string) => void;
  now?: () => Date;
}

/**
 * Fournit la base courante. Elle démarre avec la copie embarquée (le serveur répond tout de suite),
 * puis se met à jour en ligne : au démarrage et toutes les 6 heures, avec `ETag` pour ne rien
 * retélécharger quand rien n'a changé. Toute erreur (réseau, HTTP, données invalides, base
 * anormalement réduite) conserve la base précédente.
 *
 * Réglages : `TVBOX_CHECK_OFFLINE=1` désactive tout accès réseau ; `TVBOX_CHECK_DB_URL` remplace
 * l'adresse (HTTPS uniquement).
 */
export class DatabaseProvider {
  private state: DatabaseState;
  private etag: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly bundledSocCount: number;
  private readonly fetchImpl: typeof fetch;
  private readonly log: (message: string) => void;
  private readonly now: () => Date;
  readonly url: string | null;

  constructor(options: ProviderOptions = {}) {
    const env = options.env ?? process.env;
    const bundled = loadBundledDatabase();
    this.state = { db: bundled, source: "bundled", updatedAt: null };
    this.bundledSocCount = bundled.socs.length;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.log = options.log ?? (() => {});
    this.now = options.now ?? (() => new Date());
    const offline = ["1", "true", "yes"].includes((env.TVBOX_CHECK_OFFLINE ?? "").toLowerCase());
    this.url = offline ? null : (env.TVBOX_CHECK_DB_URL ?? DEFAULT_DB_URL);
  }

  get(): DatabaseState {
    return this.state;
  }

  /** Lance la première vérification (sans bloquer) puis la vérification périodique. */
  start(): void {
    if (!this.url) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    this.timer.unref(); // ne retient pas le processus
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Vérifie la base en ligne ; renvoie `true` si une nouvelle base a été appliquée. */
  async refresh(): Promise<boolean> {
    if (!this.url) return false;
    try {
      if (!/^https:\/\//.test(this.url)) throw new Error("l'adresse doit commencer par https://");
      const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "tvbox-check-mcp",
      };
      if (this.etag) headers["If-None-Match"] = this.etag;
      const response = await this.fetchImpl(this.url, {
        headers,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (response.status === 304) {
        this.state = { ...this.state, updatedAt: this.now().toISOString() };
        return false;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (response.url && !response.url.startsWith("https://")) {
        throw new Error("redirection hors HTTPS refusée");
      }
      const text = await response.text();
      if (text.length > MAX_BYTES) throw new Error("réponse trop volumineuse");
      const db = parseDatabase(JSON.parse(text));
      if (db.socs.length < this.bundledSocCount * 0.5) {
        throw new Error("base distante anormalement réduite, ignorée");
      }
      this.etag = response.headers.get("etag");
      this.state = { db, source: "online", updatedAt: this.now().toISOString() };
      this.log(
        `données en ligne appliquées (${db.socs.length} SoC, ${db.models.length} modèles, ${db.cases.length} cas)`,
      );
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.log(
        `mise à jour en ligne impossible (${reason}) : données ${this.state.source === "online" ? "précédentes" : "embarquées"} conservées`,
      );
      return false;
    }
  }
}
