// Test de bout en bout du binaire construit : lance dist/index.js comme le ferait un client MCP
// (Claude Desktop, Claude Code…) et vérifie que les outils répondent sur stdio.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [entry],
  env: { ...process.env, TVBOX_CHECK_LANG: "fr", TVBOX_CHECK_OFFLINE: "1" },
  stderr: "pipe",
});
const client = new Client({ name: "smoke", version: "0.0.0" });

const fail = (message) => {
  console.error(`smoke : ÉCHEC, ${message}`);
  process.exit(1);
};

try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  if (tools.join() !== "check_box,get_model,get_soc,search") fail(`outils inattendus : ${tools}`);

  const r = await client.callTool({
    name: "check_box",
    arguments: { soc: "S905X", ram_gb: 4 },
  });
  if (r.structuredContent?.overall !== "impossible") fail("S905X + 4 Go devrait être impossible");
  if (!/Go de RAM/.test(r.content[0].text)) fail("la langue par défaut (fr) n'est pas appliquée");

  const en = await client.callTool({
    name: "get_soc",
    arguments: { soc: "S905X", language: "en" },
  });
  if (en.structuredContent?.ram_max_gb?.value !== 3)
    fail("get_soc : RAM max du S905X attendue = 3");
  if (r.structuredContent?.meta?.data_source !== "bundled")
    fail("mode hors ligne : source attendue = bundled");
  console.log(`smoke OK : ${tools.length} outils, base embarquée, réponses fr et en.`);
  await client.close();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
