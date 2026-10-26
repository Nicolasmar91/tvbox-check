#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadDatabase } from "./data.ts";
import { createServer } from "./server.ts";

async function main(): Promise<void> {
  const { db, source, warning } = await loadDatabase();
  const lang = process.env.TVBOX_CHECK_LANG === "fr" ? "fr" : "en";
  // stdout est réservé au protocole MCP : les messages vont sur stderr.
  if (warning) console.error(`[tvbox-check] ${warning}`);
  console.error(
    `[tvbox-check] ${db.socs.length} SoC, ${db.models.length} modèles, ${db.cases.length} cas (${source})`,
  );
  const server = createServer(db, lang);
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("[tvbox-check] erreur fatale :", error);
  process.exit(1);
});
