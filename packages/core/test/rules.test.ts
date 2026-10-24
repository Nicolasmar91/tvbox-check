import { describe, expect, it } from "vitest";
import { evaluate, normalizeName } from "../src/rules.ts";
import type { Database } from "../src/schemas.ts";

function sourced<T>(value: T, status: "verified" | "unverified" = "unverified") {
  return { value, status, sources: status === "verified" ? ["src-a"] : [] };
}

function makeDb(status: "verified" | "unverified"): Database {
  return {
    sources: [
      {
        id: "src-a",
        url: "https://example.org/a",
        title: "A",
        type: "datasheet",
        accessed: "2026-10-24",
      },
    ],
    socs: [
      {
        id: "amlogic-s905w",
        vendor: "Amlogic",
        name: "S905W",
        aliases: ["S905W"],
        cores: 4,
        arch: "Cortex-A53",
        ram_max_gb: sourced(2, status),
        ram_types: sourced(["DDR3"], status),
        ethernet_max_mbps: sourced(100, status),
        video_max_decode: sourced("4K", status),
        notes_fr: null,
      },
      {
        id: "empty-soc",
        vendor: "X",
        name: "Empty",
        aliases: [],
        cores: null,
        arch: null,
        ram_max_gb: null,
        ram_types: null,
        ethernet_max_mbps: null,
        video_max_decode: null,
        notes_fr: null,
      },
    ],
    cases: [
      {
        id: "tx3-mini-4-32",
        marketed_name: "TX3 Mini",
        marketed: { soc: "amlogic-s905w", ram_gb: 4, storage_gb: 32 },
        observed: { soc: "amlogic-s905w", ram_gb: 1, storage_gb: 6, confidence: "probable" },
        how_observed: ["armbian-boot"],
        type: "inflated-specs",
        summary_fr: "Annoncée 4/32, vue 1 Go.",
        sources: ["src-a"],
        added: "2026-10-24",
      },
    ],
  };
}

const unverifiedDb = makeDb("unverified");
const verifiedDb = makeDb("verified");

describe("RAM", () => {
  it("suspect si la limite n'est pas vérifiée", () => {
    const r = evaluate({ soc: "amlogic-s905w", ramGb: 4 }, unverifiedDb);
    expect(r.overall).toBe("suspect");
    expect(r.criteria[0]).toMatchObject({
      criterion: "ram",
      verdict: "suspect",
      status: "unverified",
    });
  });

  it("impossible si la limite est vérifiée", () => {
    const r = evaluate({ soc: "amlogic-s905w", ramGb: 4 }, verifiedDb);
    expect(r.overall).toBe("impossible");
    expect(r.criteria[0]).toMatchObject({
      verdict: "impossible",
      status: "verified",
      sources: ["src-a"],
    });
  });

  it("plausible sous la limite (et à la limite)", () => {
    expect(evaluate({ soc: "amlogic-s905w", ramGb: 2 }, unverifiedDb).overall).toBe("plausible");
    expect(evaluate({ soc: "amlogic-s905w", ramGb: 1 }, verifiedDb).overall).toBe("plausible");
  });

  it("unknown si la limite est null", () => {
    const r = evaluate({ soc: "empty-soc", ramGb: 4 }, unverifiedDb);
    expect(r.criteria[0]).toMatchObject({ criterion: "ram", verdict: "unknown" });
    expect(r.overall).toBe("unknown");
  });

  it("résout un SoC par alias, insensible à la casse", () => {
    expect(evaluate({ soc: "s905w", ramGb: 4 }, verifiedDb).overall).toBe("impossible");
  });
});

describe("Ethernet", () => {
  it("suspect / impossible / plausible", () => {
    expect(evaluate({ soc: "amlogic-s905w", ethernet: "1G" }, unverifiedDb).overall).toBe(
      "suspect",
    );
    expect(evaluate({ soc: "amlogic-s905w", ethernet: "1G" }, verifiedDb).overall).toBe(
      "impossible",
    );
    expect(evaluate({ soc: "amlogic-s905w", ethernet: "100M" }, verifiedDb).overall).toBe(
      "plausible",
    );
    expect(evaluate({ soc: "amlogic-s905w", ethernet: "none" }, verifiedDb).overall).toBe(
      "plausible",
    );
  });

  it("unknown si ethernet_max_mbps est null", () => {
    expect(evaluate({ soc: "empty-soc", ethernet: "1G" }, verifiedDb).overall).toBe("unknown");
  });
});

describe("Vidéo", () => {
  it("8K annoncé sur un SoC 4K : suspect / impossible", () => {
    expect(evaluate({ soc: "amlogic-s905w", videoMax: "8K" }, unverifiedDb).overall).toBe(
      "suspect",
    );
    expect(evaluate({ soc: "amlogic-s905w", videoMax: "8K" }, verifiedDb).overall).toBe(
      "impossible",
    );
  });

  it("4K annoncé sur un SoC 4K : plausible", () => {
    expect(evaluate({ soc: "amlogic-s905w", videoMax: "4K" }, verifiedDb).overall).toBe(
      "plausible",
    );
  });

  it("unknown si video_max_decode est null", () => {
    expect(evaluate({ soc: "empty-soc", videoMax: "8K" }, verifiedDb).overall).toBe("unknown");
  });
});

describe("Cas connu", () => {
  it("détecte un modèle connu et renvoie le cas", () => {
    const r = evaluate({ modelName: "TX3 Mini" }, unverifiedDb);
    expect(r.overall).toBe("suspect");
    expect(r.criteria[0]).toMatchObject({ criterion: "knownCase", verdict: "suspect" });
    expect(r.criteria[0]?.case?.id).toBe("tx3-mini-4-32");
    expect(r.criteria[0]?.sources).toEqual(["src-a"]);
  });

  it("normalise casse, espaces et ponctuation", () => {
    expect(normalizeName("  tX3-  MINI ")).toBe("tx3mini");
    expect(evaluate({ modelName: "  tx3   mini " }, unverifiedDb).overall).toBe("suspect");
  });

  it("modèle inconnu sans SoC : unknown, pas d'erreur", () => {
    const r = evaluate({ modelName: "Boîte Inconnue 9000" }, unverifiedDb);
    expect(r.overall).toBe("unknown");
  });
});

describe("Cas limites", () => {
  it("SoC absent de la base : unknown + invitation à contribuer", () => {
    const r = evaluate({ soc: "inconnu-x", ramGb: 8 }, verifiedDb);
    expect(r.overall).toBe("unknown");
    expect(r.criteria).toHaveLength(1);
    expect(r.criteria[0]).toMatchObject({ criterion: "soc", verdict: "unknown" });
    expect(r.criteria[0]?.message).toContain("contribuer");
  });

  it("aucun critère renseigné : unknown, sans critère", () => {
    const r = evaluate({}, verifiedDb);
    expect(r.overall).toBe("unknown");
    expect(r.criteria).toEqual([]);
  });

  it("SoC seul, sans champ à comparer : unknown", () => {
    expect(evaluate({ soc: "amlogic-s905w" }, verifiedDb).overall).toBe("unknown");
  });

  it("le pire verdict l'emporte : impossible > suspect > unknown > plausible", () => {
    const r = evaluate(
      { soc: "amlogic-s905w", ramGb: 4, ethernet: "100M", modelName: "tx3 mini" },
      verifiedDb,
    );
    expect(r.overall).toBe("impossible");
    const r2 = evaluate({ soc: "amlogic-s905w", ramGb: 2, modelName: "tx3 mini" }, verifiedDb);
    expect(r2.overall).toBe("suspect");
  });
});
