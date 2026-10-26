#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DatabaseProvider } from "./data.ts";
import { createServer } from "./server.ts";

async function main(): Promise<void> {
  // stdout est réservé au protocole MCP : les messages vont sur stderr.
  const log = (message: string) => console.error(`[tvbox-check] ${message}`);
  const provider = new DatabaseProvider({ log });
  const { db } = provider.get();
  log(
    `${db.socs.length} SoC, ${db.models.length} modèles, ${db.cases.length} cas (copie embarquée)` +
      (provider.url ? ` ; vérification en ligne : ${provider.url}` : " ; mode hors ligne"),
  );

  const lang = process.env.TVBOX_CHECK_LANG === "fr" ? "fr" : "en";
  const server = createServer(() => provider.get(), lang);
  await server.connect(new StdioServerTransport());
  // Après la connexion : le client n'attend jamais le réseau.
  provider.start();
}

main().catch((error) => {
  console.error("[tvbox-check] erreur fatale :", error);
  process.exit(1);
});
