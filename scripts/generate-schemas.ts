import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CaseSchema, ReportSchema, SocSchema, SourceSchema } from "@tvbox-check/core";

const dir = fileURLToPath(new URL("../data/schema/", import.meta.url));
mkdirSync(dir, { recursive: true });
for (const [name, schema] of Object.entries({
  soc: SocSchema,
  case: CaseSchema,
  source: SourceSchema,
  report: ReportSchema,
})) {
  writeFileSync(
    `${dir}${name}.schema.json`,
    JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n",
  );
}
console.log("JSON Schema générés dans data/schema/");
