/* eslint-disable @typescript-eslint/no-explicit-any -- structuredContent des outils MCP : JSON non typé côté client */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeAll, describe, expect, it } from "vitest";
import { loadBundledDatabase, loadDatabase, parseDatabase } from "../src/data.ts";
import { SERVER_INSTRUCTIONS, createServer } from "../src/server.ts";

const db = loadBundledDatabase();

async function connect(defaultLocale: "fr" | "en" = "en") {
  const server = createServer(db, defaultLocale);
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

describe("chargement des données", () => {
  it("utilise la base embarquée par défaut", async () => {
    const r = await loadDatabase({}, (() => {
      throw new Error("aucun appel réseau attendu");
    }) as unknown as typeof fetch);
    expect(r.source).toBe("bundled");
    expect(r.db.socs.length).toBeGreaterThan(40);
  });

  it("refuse une adresse non HTTPS et garde la base embarquée", async () => {
    const r = await loadDatabase({ TVBOX_CHECK_DB_URL: "http://exemple.org/db.json" });
    expect(r.source).toBe("bundled");
    expect(r.warning).toContain("https://");
  });

  it("ignore une base distante invalide", async () => {
    const fake = (async () =>
      new Response(JSON.stringify({ socs: [] }))) as unknown as typeof fetch;
    const r = await loadDatabase({ TVBOX_CHECK_DB_URL: "https://exemple.org/db.json" }, fake);
    expect(r.source).toBe("bundled");
    expect(r.warning).toContain("ignorée");
  });

  it("utilise une base distante valide", async () => {
    const fake = (async () => new Response(JSON.stringify(db))) as unknown as typeof fetch;
    const r = await loadDatabase({ TVBOX_CHECK_DB_URL: "https://exemple.org/db.json" }, fake);
    expect(r.source).toBe("remote");
    expect(parseDatabase(r.db).socs.length).toBe(db.socs.length);
  });
});
