import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (name: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../data/${name}.json`, import.meta.url)), "utf8"));

export function loadRawDatabase(): unknown {
  return {
    socs: read("socs"),
    cases: read("cases"),
    models: read("models"),
    sources: read("sources"),
  };
}
