/**
 * Garde-fou de traduction : chaque page du site construit doit exister dans les deux langues.
 * À lancer après `pnpm build`. Échoue si une page française n'a pas son équivalent anglais
 * (ou l'inverse), ou si une page anglaise est déclarée avec une autre langue.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alternatePath, langOfPath } from "../apps/web/src/i18n/index.ts";

// Chemins en « / » même sous Windows, pour comparer des routes d'URL.
const dist = fileURLToPath(new URL("../apps/web/dist/", import.meta.url)).replaceAll("\\", "/");
if (!existsSync(dist)) {
  console.error("apps/web/dist introuvable : lancez d'abord `pnpm build`.");
  process.exit(1);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = `${dir}${name}`;
    return statSync(full).isDirectory() ? walk(`${full}/`) : [full];
  });
}

const routes = walk(dist)
  .filter((f) => f.endsWith("/index.html") && !f.includes("/_astro/"))
  .map((f) => f.slice(dist.length - 1, -"index.html".length));

const known = new Set(routes);
const errors: string[] = [];

for (const route of routes) {
  const lang = langOfPath(route);
  const other = lang === "fr" ? "en" : "fr";
  const alt = alternatePath(route, other);
  if (!known.has(alt)) errors.push(`${route} : pas d'équivalent ${other} (attendu ${alt})`);

  const html = readFileSync(`${dist}${route.replace(/^\//, "")}index.html`, "utf8");
  const declared = /<html[^>]*\blang="(\w+)"/.exec(html)?.[1];
  if (declared !== lang) errors.push(`${route} : <html lang="${declared}"> au lieu de "${lang}"`);
}

if (errors.length > 0) {
  console.error(`Parité FR/EN : ${errors.length} problème(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`i18n OK : ${routes.length} pages, chaque page existe en français et en anglais.`);
