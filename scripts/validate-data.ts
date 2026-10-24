import { validateDatabase } from "@tvbox-check/core";
import { loadRawDatabase } from "./load-data.ts";

const result = validateDatabase(loadRawDatabase());
if (!result.ok) {
  console.error("Données invalides :");
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}
const unverified = result.db!.socs.filter((s) => s.ram_max_gb?.status !== "verified").length;
console.log(
  `OK : ${result.db!.socs.length} SoC (${unverified} sans RAM max vérifiée), ` +
    `${result.db!.cases.length} cas, ${result.db!.sources.length} sources.`,
);
