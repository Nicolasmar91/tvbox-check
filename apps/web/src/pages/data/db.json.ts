import { db } from "../../lib/db";

/**
 * Base complète publiée en JSON (licence CC BY 4.0) : réutilisable par d'autres outils et par le
 * connecteur MCP via `TVBOX_CHECK_DB_URL`. Toujours validée par le schéma au moment du build.
 */
export function GET(): Response {
  return new Response(JSON.stringify(db), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
