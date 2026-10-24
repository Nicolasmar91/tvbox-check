import { describe, expect, it } from "vitest";
import { evaluate } from "../src/rules.ts";
import { validateDatabase } from "../src/validate.ts";
import { loadRawDatabase } from "../../../scripts/load-data.ts";

describe("données réelles", () => {
  it("la base du dépôt est valide", () => {
    const r = validateDatabase(loadRawDatabase());
    expect(r.errors).toEqual([]);
  });
});

describe("validateDatabase", () => {
  const base = () =>
    structuredClone(loadRawDatabase()) as {
      socs: { id: string }[];
      cases: { sources: string[]; observed: { confidence: string }; how_observed: string[] }[];
      sources: { id: string }[];
    };

  it("rejette une source référencée inexistante", () => {
    const db = base();
    db.cases[0]!.sources = ["src-fantome"];
    expect(validateDatabase(db).errors.join()).toContain("src-fantome");
  });

  it("rejette un id dupliqué", () => {
    const db = base();
    db.sources.push({ ...db.sources[0]! });
    expect(validateDatabase(db).errors.join()).toContain("dupliqué");
  });

  it("rejette un cas `confirmed` sans preuve forte", () => {
    const db = base();
    db.cases[0]!.observed.confidence = "confirmed";
    db.cases[0]!.how_observed = ["armbian-boot"];
    expect(validateDatabase(db).ok).toBe(false);
  });

  it("rejette une valeur `verified` sans source", () => {
    const db = base() as unknown as { socs: { ram_max_gb: unknown }[] };
    db.socs[0]!.ram_max_gb = { value: 2, status: "verified", sources: [] };
    expect(validateDatabase(db).ok).toBe(false);
  });
});

describe("verdicts sur la base réelle", () => {
  const db = () => validateDatabase(loadRawDatabase()).db!;

  it("S905X : 4 Go impossible (datasheet), 3 Go plausible", () => {
    expect(evaluate({ soc: "amlogic-s905x", ramGb: 4 }, db()).overall).toBe("impossible");
    expect(evaluate({ soc: "amlogic-s905x", ramGb: 3 }, db()).overall).toBe("plausible");
  });

  it("S905W : 4 Go suspect seulement (base communautaire)", () => {
    expect(evaluate({ soc: "amlogic-s905w", ramGb: 4 }, db()).overall).toBe("suspect");
  });

  it("H6 : limite de RAM contradictoire, donc aucun verdict", () => {
    expect(evaluate({ soc: "allwinner-h6", ramGb: 8 }, db()).overall).toBe("unknown");
  });

  it("une valeur communautaire ne peut pas être `verified`", () => {
    const raw = structuredClone(loadRawDatabase()) as { socs: { id: string; ram_max_gb: any }[] };
    const s905w = raw.socs.find((s) => s.id === "amlogic-s905w")!;
    s905w.ram_max_gb.status = "verified";
    expect(validateDatabase(raw).ok).toBe(false);
  });
});
