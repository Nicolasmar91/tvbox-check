import { describe, expect, it } from "vitest";
import { evaluate, findModel, modelsForSoc, normalizeName, socsForModel } from "../src/rules.ts";
import type { Database } from "../src/schemas.ts";

function sourced<T>(
  value: T,
  status: "verified" | "unverified" = "unverified",
  basis: "datasheet" | "community" | "hypothesis" = status === "verified"
    ? "datasheet"
    : "community",
) {
  return { value, status, basis, sources: basis === "hypothesis" ? [] : ["src-a"] };
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
        community_findings: [],
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
        community_findings: [],
        notes_fr: null,
      },
    ],
    models: [],
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

describe("Base de la donnée", () => {
  it("suspect avec une base communautaire, impossible avec une datasheet", () => {
    const community = evaluate({ soc: "amlogic-s905w", ramGb: 4 }, unverifiedDb);
    expect(community.criteria[0]).toMatchObject({ verdict: "suspect", basis: "community" });
    const datasheet = evaluate({ soc: "amlogic-s905w", ramGb: 4 }, verifiedDb);
    expect(datasheet.criteria[0]).toMatchObject({ verdict: "impossible", basis: "datasheet" });
  });

  it("une hypothèse non sourcée ne produit jamais de verdict de fraude", () => {
    const db = makeDb("unverified");
    db.socs[0]!.ram_max_gb = sourced(2, "unverified", "hypothesis");
    const r = evaluate({ soc: "amlogic-s905w", ramGb: 8 }, db);
    expect(r.overall).toBe("unknown");
    expect(r.criteria[0]).toMatchObject({ verdict: "unknown", basis: "hypothesis" });
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

  it("renvoie tous les cas portant le même nom", () => {
    const db = makeDb("unverified");
    db.cases.push({ ...db.cases[0]!, id: "tx3-mini-autre", summary_fr: "Autre écart signalé." });
    const r = evaluate({ modelName: "TX3 Mini" }, db);
    expect(r.criteria.filter((c) => c.criterion === "knownCase").map((c) => c.case?.id)).toEqual([
      "tx3-mini-4-32",
      "tx3-mini-autre",
    ]);
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

describe("Catalogue de modèles", () => {
  const db = makeDb("unverified");
  db.models = [
    {
      id: "box-a",
      name: "Box A",
      aliases: ["BoxA 2"],
      brand: null,
      variants: [
        {
          soc: "amlogic-s905w",
          kind: "official",
          ram_gb: [1, 2],
          storage_gb: null,
          year: 2018,
          note_fr: null,
          sources: ["src-a"],
        },
      ],
      notes_fr: null,
    },
  ];

  it("trouve un modèle par nom ou alias normalisé", () => {
    expect(findModel(db, "  box-a ")?.id).toBe("box-a");
    expect(findModel(db, "BOXA2")?.id).toBe("box-a");
    expect(findModel(db, "Box B")).toBeUndefined();
  });

  it("distingue un modèle de sa version « + »", () => {
    expect(normalizeName("X96 mini+")).toBe("x96miniplus");
    expect(normalizeName("X96 Max Plus")).toBe(normalizeName("X96 Max+"));
    expect(normalizeName("X96 mini+")).not.toBe(normalizeName("X96 mini"));
  });

  it("liste les SoC d'un modèle et les modèles d'un SoC", () => {
    expect(socsForModel(db, db.models[0]!).map((s) => s.id)).toEqual(["amlogic-s905w"]);
    expect(modelsForSoc(db, "amlogic-s905w").map((x) => x.id)).toEqual(["box-a"]);
    expect(modelsForSoc(db, "empty-soc")).toEqual([]);
  });

  it("SoC répertorié pour le modèle : plausible", () => {
    const r = evaluate({ modelName: "Box A", soc: "S905W" }, db);
    expect(r.criteria.find((c) => c.criterion === "modelSoc")).toMatchObject({
      verdict: "plausible",
      sources: ["src-a"],
    });
  });

  it("SoC hors catalogue : suspect, jamais impossible", () => {
    const verified = makeDb("verified");
    verified.models = db.models;
    const r = evaluate({ modelName: "Box A", soc: "empty-soc" }, verified);
    expect(r.criteria.find((c) => c.criterion === "modelSoc")).toMatchObject({
      verdict: "suspect",
    });
    expect(r.overall).toBe("suspect");
  });

  it("une puce seulement signalée n'est pas attendue : suspect avec le motif", () => {
    const rep = makeDb("unverified");
    rep.models = [
      {
        ...db.models[0]!,
        variants: [
          ...db.models[0]!.variants,
          { ...db.models[0]!.variants[0]!, soc: "empty-soc", kind: "reported", ram_gb: null },
        ],
      },
    ];
    const r = evaluate({ modelName: "Box A", soc: "empty-soc" }, rep);
    const c = r.criteria.find((x) => x.criterion === "modelSoc");
    expect(c?.verdict).toBe("suspect");
    expect(c?.message).toContain("déjà été signalé");
    expect(socsForModel(rep, rep.models[0]!).map((s) => s.id)).toEqual(["amlogic-s905w"]);
    expect(socsForModel(rep, rep.models[0]!, "reported").map((s) => s.id)).toEqual(["empty-soc"]);
  });

  it("sans révision officielle, aucune comparaison de SoC", () => {
    const only = makeDb("unverified");
    only.models = [
      { ...db.models[0]!, variants: [{ ...db.models[0]!.variants[0]!, kind: "reported" }] },
    ];
    const r = evaluate({ modelName: "Box A", soc: "amlogic-s905w" }, only);
    expect(r.criteria.some((c) => c.criterion === "modelSoc")).toBe(false);
  });

  it("RAM au-delà des configurations répertoriées : inconnu, pas accusé", () => {
    const r = evaluate({ modelName: "Box A", soc: "S905W", ramGb: 2 }, db);
    expect(r.criteria.some((c) => c.criterion === "modelSpecs")).toBe(false);
    const r2 = evaluate({ modelName: "Box A", soc: "amlogic-s905w", ramGb: 4 }, db);
    expect(r2.criteria.find((c) => c.criterion === "modelSpecs")).toMatchObject({
      verdict: "unknown",
    });
  });

  it("sans modèle connu, aucun critère de catalogue", () => {
    const r = evaluate({ modelName: "Autre", soc: "S905W", ramGb: 1 }, db);
    expect(r.criteria.some((c) => c.criterion.startsWith("model"))).toBe(false);
  });
});
