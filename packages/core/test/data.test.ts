import { describe, expect, it } from "vitest";
import { evaluate } from "../src/rules.ts";
import { registrableDomain, validateDatabase } from "../src/validate.ts";
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
    const raw = structuredClone(loadRawDatabase()) as {
      socs: { id: string; ram_max_gb: { status: string } }[];
    };
    const s905w = raw.socs.find((s) => s.id === "amlogic-s905w")!;
    s905w.ram_max_gb.status = "verified";
    expect(validateDatabase(raw).ok).toBe(false);
  });
});

describe("base « recoupée » (corroborated)", () => {
  type Raw = {
    socs: { id: string; ram_max_gb: unknown }[];
    sources: { id: string; url: string; title: string; type: string; accessed: string }[];
  };
  const withSources = (urls: string[]) => {
    const raw = structuredClone(loadRawDatabase()) as Raw;
    const ids = urls.map((url, i) => {
      const id = `src-test-${i}`;
      raw.sources.push({ id, url, title: `Test ${i}`, type: "article", accessed: "2026-10-25" });
      return id;
    });
    raw.sources.sort((a, b) => (a.id < b.id ? -1 : 1));
    return { raw, ids };
  };
  const corroborate = (raw: Raw, sources: string[]) => {
    raw.socs.find((s) => s.id === "amlogic-s905w")!.ram_max_gb = {
      value: 2,
      status: "verified",
      basis: "corroborated",
      sources,
    };
    return validateDatabase(raw);
  };

  it("accepte deux sources de domaines différents", () => {
    const { raw, ids } = withSources(["https://a.example.org/x", "https://b.example.net/y"]);
    expect(corroborate(raw, ids).errors).toEqual([]);
  });

  it("rejette deux sources du même domaine", () => {
    const { raw, ids } = withSources(["https://forum.example.org/x", "https://docs.example.org/y"]);
    expect(corroborate(raw, ids).errors.join()).toContain("deux domaines différents");
  });

  it("rejette une seule source", () => {
    const { raw, ids } = withSources(["https://a.example.org/x"]);
    expect(corroborate(raw, ids).ok).toBe(false);
  });

  it("une valeur recoupée donne `impossible`, avec sa base", () => {
    const { raw, ids } = withSources(["https://a.example.org/x", "https://b.example.net/y"]);
    const r = corroborate(raw, ids);
    expect(r.ok).toBe(true);
    const res = evaluate({ soc: "amlogic-s905w", ramGb: 4 }, r.db!);
    expect(res.criteria[0]).toMatchObject({ verdict: "impossible", basis: "corroborated" });
  });

  it("calcule le domaine enregistrable", () => {
    expect(registrableDomain("https://forum.armbian.com/topic/1")).toBe("armbian.com");
    expect(registrableDomain("https://www.cnx-software.com/x")).toBe("cnx-software.com");
    expect(registrableDomain("https://exemple.co.uk/x")).toBe("exemple.co.uk");
  });
});
