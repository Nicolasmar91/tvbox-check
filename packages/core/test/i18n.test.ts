import { describe, expect, it } from "vitest";
import { messagesEn } from "../src/messages.en.ts";
import { messagesFr } from "../src/messages.fr.ts";
import { labels } from "../src/labels.ts";
import { localized } from "../src/localized.ts";
import { searchDatabase } from "../src/search.ts";
import { evaluate } from "../src/rules.ts";
import type { Database } from "../src/schemas.ts";

const db: Database = {
  sources: [
    {
      id: "src-a",
      url: "https://example.org/a",
      title: "A",
      title_en: "A",
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
      arch: null,
      ram_max_gb: { value: 2, status: "verified", basis: "datasheet", sources: ["src-a"] },
      ram_types: null,
      ethernet_max_mbps: null,
      video_max_decode: null,
      community_findings: [],
      notes_fr: null,
      notes_en: null,
    },
  ],
  cases: [],
  models: [],
};

describe("messages du moteur", () => {
  it("le français et l'anglais ont exactement les mêmes clés", () => {
    expect(Object.keys(messagesEn).sort()).toEqual(Object.keys(messagesFr).sort());
  });

  it("chaque message est rédigé dans sa langue", () => {
    expect(messagesFr.ramPlausible(2, 4)).toContain("Go de RAM");
    expect(messagesEn.ramPlausible(2, 4)).toContain("GB of RAM");
    expect(messagesEn.ramPlausible(2, 4)).not.toMatch(/Go\b|annoncés/);
  });
});

describe("evaluate selon la langue", () => {
  it("français par défaut", () => {
    const r = evaluate({ soc: "S905W", ramGb: 4 }, db);
    expect(r.criteria[0]?.message).toContain("impossible");
    expect(r.criteria[0]?.message).toContain("Go de RAM");
  });

  it("anglais à la demande, avec le même verdict", () => {
    const fr = evaluate({ soc: "S905W", ramGb: 4 }, db, "fr");
    const en = evaluate({ soc: "S905W", ramGb: 4 }, db, "en");
    expect(en.overall).toBe(fr.overall);
    expect(en.criteria[0]?.message).toContain("GB of RAM");
    expect(en.criteria[0]?.message).toContain("impossible");
  });

  it("un SoC inconnu est expliqué en anglais", () => {
    const r = evaluate({ soc: "XYZ" }, db, "en");
    expect(r.criteria[0]?.message).toContain("not in the database");
  });
});

describe("localized", () => {
  it("renvoie la langue demandée, sinon le français", () => {
    const item = { summary_fr: "Bonjour", summary_en: "Hello" };
    expect(localized(item, "summary", "en")).toBe("Hello");
    expect(localized(item, "summary", "fr")).toBe("Bonjour");
    expect(localized({ summary_fr: "Seul" }, "summary", "en")).toBe("Seul");
    expect(localized({}, "summary", "en")).toBeNull();
  });
});

describe("libellés partagés", () => {
  it("le français et l'anglais ont la même structure", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? keys(v).map((x) => `${k}.${x}`) : [k],
      );
    expect(keys(labels.en).sort()).toEqual(keys(labels.fr).sort());
  });
});

describe("recherche", () => {
  it("trouve par nom, alias, accent et ponctuation", () => {
    const hits = searchDatabase(db, "s905-w", "fr");
    expect(hits.map((h) => `${h.type}:${h.id}`)).toContain("soc:amlogic-s905w");
    expect(searchDatabase(db, "AMLOGIC s905w", "en")).toHaveLength(1);
  });

  it("renvoie une liste vide pour une requête vide ou sans résultat", () => {
    expect(searchDatabase(db, "   ", "en")).toEqual([]);
    expect(searchDatabase(db, "zzzz-inconnu", "en")).toEqual([]);
  });

  it("respecte la limite", () => {
    expect(searchDatabase(db, "a", "en", 1).length).toBeLessThanOrEqual(1);
  });
});
