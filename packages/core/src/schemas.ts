import { z } from "zod";

export const StatusSchema = z.enum(["verified", "unverified"]);
export type Status = z.infer<typeof StatusSchema>;

/** Valeur technique accompagnée de sa provenance. `null` = inconnu (jamais inventé). */
function sourced<T extends z.ZodType>(value: T) {
  return z
    .object({
      value,
      status: StatusSchema,
      sources: z.array(z.string()),
    })
    .refine((v) => v.status !== "verified" || v.sources.length > 0, {
      message: "une valeur `verified` exige au moins une source",
    })
    .nullable();
}

export const VideoLevelSchema = z.enum(["1080p", "4K", "6K", "8K"]);
export type VideoLevel = z.infer<typeof VideoLevelSchema>;

export const SourceSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  title: z.string().min(1),
  type: z.enum(["datasheet", "vendor", "forum", "article", "own-observation"]),
  accessed: z.iso.date(),
});
export type Source = z.infer<typeof SourceSchema>;

export const SocSchema = z.object({
  id: z.string().min(1),
  vendor: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()),
  cores: z.number().int().positive().nullable(),
  arch: z.string().nullable(),
  ram_max_gb: sourced(z.number().positive()),
  ram_types: sourced(z.array(z.string())),
  ethernet_max_mbps: sourced(z.number().positive()),
  video_max_decode: sourced(VideoLevelSchema),
  notes_fr: z.string().nullable(),
});
export type Soc = z.infer<typeof SocSchema>;

export const HowObservedSchema = z.enum([
  "armbian-boot",
  "uart-log",
  "chip-photo",
  "datasheet",
  "aida64",
  "f3-test",
  "linux-proc",
]);
export type HowObserved = z.infer<typeof HowObservedSchema>;

/** Preuves jugées fortes : requises pour passer un cas à `confirmed`. */
export const STRONG_PROOFS: readonly HowObserved[] = ["chip-photo", "uart-log", "f3-test"];

const SpecsSchema = z.object({
  soc: z.string().nullable(),
  ram_gb: z.number().positive().nullable(),
  storage_gb: z.number().positive().nullable(),
});

export const CaseSchema = z
  .object({
    id: z.string().min(1),
    marketed_name: z.string().min(1),
    marketed: SpecsSchema,
    observed: SpecsSchema.extend({
      confidence: z.enum(["confirmed", "probable", "reported"]),
    }),
    how_observed: z.array(HowObservedSchema),
    type: z.enum(["inflated-specs", "wrong-soc", "impossible-claim", "relabeled"]),
    summary_fr: z.string().min(1),
    sources: z.array(z.string()).min(1),
    added: z.iso.date(),
  })
  .refine(
    (c) =>
      c.observed.confidence !== "confirmed" ||
      c.how_observed.some((h) => STRONG_PROOFS.includes(h)),
    { message: "un cas `confirmed` exige une preuve forte (chip-photo, uart-log, f3-test)" },
  );
export type Case = z.infer<typeof CaseSchema>;

export const DatabaseSchema = z.object({
  socs: z.array(SocSchema),
  cases: z.array(CaseSchema),
  sources: z.array(SourceSchema),
});
export type Database = z.infer<typeof DatabaseSchema>;

/** Rapport de scan : schéma prêt pour le futur scanner CLI (niveaux 2-3), sans écran au MVP. */
export const ReportSchema = z.object({
  soc_detected: z.string().nullable(),
  ram_total_mb: z.number().nonnegative().nullable(),
  storage_total_gb: z.number().nonnegative().nullable(),
  ethernet_speed: z.enum(["100M", "1G", "none"]).nullable(),
  kernel: z.string().nullable(),
  dtb: z.string().nullable(),
  tool: z.string(),
  tool_version: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;
