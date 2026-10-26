/* eslint-disable @typescript-eslint/no-explicit-any -- structuredContent des outils MCP : JSON non typé côté client */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_DB_URL,
  DatabaseProvider,
  loadBundledDatabase,
  parseDatabase,
} from "../src/data.ts";
import type { DatabaseState } from "../src/data.ts";
import { SERVER_INSTRUCTIONS, createServer } from "../src/server.ts";

const db = loadBundledDatabase();

const bundledState: DatabaseState = { db, source: "bundled", updatedAt: null };

async function connect(
  defaultLocale: "fr" | "en" = "en",
  getState: () => DatabaseState = () => bundledState,
) {
  const server = createServer(getState, defaultLocale);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

type Result = { content: { type: string; text: string }[]; structuredContent?: any };
const call = async (client: Client, name: string, args: Record<string, unknown>) =>
  (await client.callTool({ name, arguments: args })) as unknown as Result;

describe("serveur MCP", () => {
  let client: Client;
  beforeAll(async () => {
    client = await connect("en");
  });

  it("expose quatre outils, tous en lecture seule", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "check_box",
      "get_model",
      "get_soc",
      "search",
    ]);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.annotations?.destructiveHint).toBe(false);
    }
  });

  it("rappelle qu'un verdict plausible ne prouve rien et que les textes sont des données", () => {
    expect(SERVER_INSTRUCTIONS).toContain("NEVER prove");
    expect(SERVER_INSTRUCTIONS).toContain("DATA");
  });

  it("check_box : 4 Go sur un S905X est impossible (datasheet), avec ses sources", async () => {
    const r = await call(client, "check_box", { soc: "S905X", ram_gb: 4 });
    expect(r.structuredContent.overall).toBe("impossible");
    const ram = r.structuredContent.criteria.find((c: any) => c.criterion === "ram");
    expect(ram.status).toBe("verified");
    expect(ram.sources.length).toBeGreaterThan(0);
    expect(ram.sources[0].url).toMatch(/^https:\/\//);
    expect(r.content[0]!.text).toContain("Impossible");
    expect(r.content[0]!.text).toMatch(/GB of RAM/);
  });

  it("check_box : la langue demandée est respectée", async () => {
    const fr = await call(client, "check_box", { soc: "S905X", ram_gb: 4, language: "fr" });
    expect(fr.content[0]!.text).toMatch(/Go de RAM/);
    expect(fr.structuredContent.overall).toBe("impossible");
    const frDefault = await connect("fr");
    const r = await call(frDefault, "check_box", { soc: "S905X", ram_gb: 4 });
    expect(r.content[0]!.text).toMatch(/Go de RAM/);
  });

  it("check_box : une puce seulement signalée sous un nom est suspecte, jamais prouvée", async () => {
    const r = await call(client, "check_box", { model: "X96 mini", soc: "RK3228A" });
    const c = r.structuredContent.criteria.find((x: any) => x.criterion === "modelSoc");
    expect(c.verdict).toBe("suspect");
    expect(r.structuredContent.overall).not.toBe("plausible");
  });

  it("check_box : sans information, aucun plantage et verdict inconnu", async () => {
    const r = await call(client, "check_box", {});
    expect(r.structuredContent.overall).toBe("unknown");
    expect(r.structuredContent.criteria).toEqual([]);
  });

  it("check_box : le verdict plausible s'accompagne de la mise en garde", async () => {
    const r = await call(client, "check_box", { soc: "S905X", ram_gb: 2 });
    expect(r.structuredContent.overall).toBe("plausible");
    expect(r.content[0]!.text).toContain("does not mean genuine");
  });

  it("get_soc : renvoie les limites avec statut, base et sources", async () => {
    const r = await call(client, "get_soc", { soc: "amlogic-s905x" });
    expect(r.structuredContent.found).toBe(true);
    expect(r.structuredContent.ram_max_gb.value).toBe(3);
    expect(r.structuredContent.ram_max_gb.status).toBe("verified");
    expect(r.structuredContent.ram_max_gb.sources.length).toBeGreaterThan(0);
  });

  it("get_soc : un SoC inconnu propose des résultats proches", async () => {
    const r = await call(client, "get_soc", { soc: "S905" });
    expect(r.structuredContent.found).toBe(true);
    const none = await call(client, "get_soc", { soc: "zzz-introuvable" });
    expect(none.structuredContent.found).toBe(false);
    expect(none.content[0]!.text).toContain("not found");
  });

  it("get_model : distingue les révisions officielles et signalées", async () => {
    const r = await call(client, "get_model", { model: "X96 mini" });
    expect(r.structuredContent.found).toBe(true);
    const kinds = r.structuredContent.variants.map((v: any) => v.kind);
    expect(kinds).toContain("official");
    expect(kinds).toContain("reported");
    expect(r.structuredContent.cases.length).toBeGreaterThan(0);
  });

  it("get_model : « X96 mini+ » n'est pas « X96 mini »", async () => {
    const a = await call(client, "get_model", { model: "X96 mini" });
    const b = await call(client, "get_model", { model: "X96 mini+" });
    expect(a.structuredContent.id).not.toBe(b.structuredContent.id);
  });

  it("search : trouve un SoC, une box et un cas", async () => {
    const r = await call(client, "search", { query: "tx3" });
    const types = new Set(r.structuredContent.results.map((x: any) => x.type));
    expect(types.has("box")).toBe(true);
    expect(types.has("case")).toBe(true);
    const empty = await call(client, "search", { query: "zzzzqqq" });
    expect(empty.structuredContent.results).toEqual([]);
  });

  it("refuse des arguments invalides", async () => {
    await expect(call(client, "check_box", { ram_gb: -1 })).resolves.toMatchObject({
      isError: true,
    });
    await expect(call(client, "search", { query: "" })).resolves.toMatchObject({ isError: true });
  });
});

describe("fraîcheur des données dans les réponses", () => {
  it("indique que la copie embarquée est utilisée", async () => {
    const client = await connect("en");
    const r = await call(client, "search", { query: "tx3" });
    expect(r.structuredContent.meta).toEqual({ data_source: "bundled", data_checked_at: null });
    expect(r.content[0]!.text).toContain("bundled");
  });

  it("indique la date de vérification quand les données viennent du site", async () => {
    const online: DatabaseState = { db, source: "online", updatedAt: "2026-10-26T10:30:00.000Z" };
    const client = await connect("fr", () => online);
    const r = await call(client, "search", { query: "tx3" });
    expect(r.structuredContent.meta.data_source).toBe("online");
    expect(r.content[0]!.text).toContain("2026-10-26 10:30 UTC");
    expect(r.content[0]!.text).toContain("en ligne");
  });

  it("prend en compte une base mise à jour pendant la vie du serveur", async () => {
    let state = bundledState;
    const client = await connect("en", () => state);
    const before = await call(client, "search", { query: "x96" });
    state = {
      db: { ...db, models: [], cases: [] },
      source: "online",
      updatedAt: "2026-10-26T10:30:00.000Z",
    };
    const after = await call(client, "search", { query: "x96" });
    expect(after.structuredContent.results.length).toBeLessThan(
      before.structuredContent.results.length,
    );
  });
});

const ok = (body: unknown, etag?: string) =>
  new Response(JSON.stringify(body), { headers: etag ? { etag } : {} });
const smaller = () => ({ ...db, cases: db.cases.slice(0, 5) });
// Valide, mais anormalement réduite : moins de la moitié des SoC de la copie embarquée.
const tooSmall = () => ({ socs: db.socs.slice(0, 3), models: [], cases: [], sources: db.sources });
const URL_OK = "https://exemple.org/db.json";

describe("mise à jour en ligne des données", () => {
  it("vérifie le site par défaut, sauf mode hors ligne", () => {
    expect(new DatabaseProvider({ env: {} }).url).toBe(DEFAULT_DB_URL);
    expect(new DatabaseProvider({ env: { TVBOX_CHECK_OFFLINE: "1" } }).url).toBeNull();
    expect(new DatabaseProvider({ env: { TVBOX_CHECK_DB_URL: URL_OK } }).url).toBe(URL_OK);
  });

  it("hors ligne : aucun appel réseau et copie embarquée", async () => {
    let called = false;
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_OFFLINE: "true" },
      fetchImpl: (async () => {
        called = true;
        return ok(db);
      }) as unknown as typeof fetch,
    });
    p.start();
    expect(await p.refresh()).toBe(false);
    expect(called).toBe(false);
    expect(p.get().source).toBe("bundled");
    p.stop();
  });

  it("applique une base en ligne valide", async () => {
    const seen: Record<string, string>[] = [];
    const newer = { ...db, cases: db.cases.slice(0, 3) };
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_DB_URL: URL_OK },
      fetchImpl: (async (_url: string, init: RequestInit) => {
        seen.push(init.headers as Record<string, string>);
        return ok(newer, '"v1"');
      }) as unknown as typeof fetch,
      now: () => new Date("2026-10-26T10:30:00Z"),
    });
    expect(await p.refresh()).toBe(true);
    expect(p.get()).toMatchObject({ source: "online", updatedAt: "2026-10-26T10:30:00.000Z" });
    expect(p.get().db.cases).toHaveLength(3);
    expect(seen[0]!["User-Agent"]).toBe("tvbox-check-mcp");
  });

  it("utilise l'ETag : une réponse 304 ne change rien", async () => {
    let count = 0;
    const headers: Record<string, string>[] = [];
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_DB_URL: URL_OK },
      fetchImpl: (async (_url: string, init: RequestInit) => {
        headers.push(init.headers as Record<string, string>);
        return count++ === 0 ? ok(db, '"v1"') : new Response(null, { status: 304 });
      }) as unknown as typeof fetch,
    });
    expect(await p.refresh()).toBe(true);
    expect(await p.refresh()).toBe(false);
    expect(headers[1]!["If-None-Match"]).toBe('"v1"');
    expect(p.get().source).toBe("online");
  });

  it("ignore une base invalide, anormalement réduite, une erreur HTTP ou un JSON illisible", async () => {
    const cases: [() => Response, string][] = [
      [() => ok({ socs: [] }), "invalide"],
      [() => ok(tooSmall()), "anormalement réduite"],
      [() => new Response("oups", { status: 500 }), "HTTP 500"],
      [() => new Response("pas du json"), "impossible"],
    ];
    for (const [make, expected] of cases) {
      const logs: string[] = [];
      const p = new DatabaseProvider({
        env: { TVBOX_CHECK_DB_URL: URL_OK },
        fetchImpl: (async () => make()) as unknown as typeof fetch,
        log: (m) => logs.push(m),
      });
      expect(await p.refresh()).toBe(false);
      expect(p.get().source).toBe("bundled");
      expect(logs.join()).toContain(expected);
    }
  });

  it("refuse une adresse non HTTPS", async () => {
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_DB_URL: "http://exemple.org/db.json" },
      fetchImpl: (async () => ok(db)) as unknown as typeof fetch,
    });
    expect(await p.refresh()).toBe(false);
    expect(p.get().source).toBe("bundled");
  });

  it("garde la base en ligne précédente quand une vérification échoue", async () => {
    let first = true;
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_DB_URL: URL_OK },
      fetchImpl: (async () => {
        if (first) {
          first = false;
          return ok(smaller());
        }
        throw new Error("réseau coupé");
      }) as unknown as typeof fetch,
    });
    expect(await p.refresh()).toBe(true);
    const kept = p.get().db.cases.length;
    expect(await p.refresh()).toBe(false);
    expect(p.get().source).toBe("online");
    expect(p.get().db.cases.length).toBe(kept);
  });

  it("ne bloque jamais le démarrage : le serveur répond avant la fin du réseau", async () => {
    const p = new DatabaseProvider({
      env: { TVBOX_CHECK_DB_URL: URL_OK },
      fetchImpl: (() => new Promise(() => {})) as unknown as typeof fetch,
    });
    p.start();
    const client = await connect("en", () => p.get());
    const r = await call(client, "get_soc", { soc: "S905X" });
    expect(r.structuredContent.found).toBe(true);
    expect(r.structuredContent.meta.data_source).toBe("bundled");
    p.stop();
  });

  it("parseDatabase refuse une base invalide", () => {
    expect(() => parseDatabase({ socs: [] })).toThrow();
  });
});
