# @tvbox-check/mcp

Serveur MCP **en lecture seule** pour interroger la base tvbox-check depuis un assistant.
Read-only MCP server to query the tvbox-check database from an assistant.

## Outils / Tools

| Outil / Tool | FR                                                                  | EN                                                                  |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `check_box`  | Compare les specs annoncées aux limites du SoC et aux cas signalés. | Compares advertised specs with the SoC's limits and reported cases. |
| `get_soc`    | Limites d'un SoC, constats, box répertoriées.                       | SoC limits, findings, listed boxes.                                 |
| `get_model`  | Révisions d'un modèle, confirmation, cas signalés.                  | Model revisions, confirmation level, reported cases.                |
| `search`     | Recherche un SoC, un modèle ou un cas.                              | Finds a SoC, a model or a case.                                     |

Chaque outil accepte `language` (`fr` ou `en`). Chaque valeur renvoyée porte son statut, sa base et ses sources. Un verdict « plausible » ne prouve jamais qu'une box est authentique.
Every tool accepts `language` (`fr` or `en`). Every value returned carries its status, basis and sources. A "plausible" verdict never proves that a box is genuine.

## Installation

Non publié sur npm pour l'instant / Not published on npm yet:

```bash
pnpm install
pnpm build:mcp          # produit / produces packages/mcp/dist/index.js
pnpm smoke:mcp          # test de bout en bout / end-to-end test
```

Claude Desktop (`claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "tvbox-check": {
      "command": "node",
      "args": ["/path/to/tvbox-check/packages/mcp/dist/index.js"],
      "env": { "TVBOX_CHECK_LANG": "en" }
    }
  }
}
```

Claude Code :

```bash
claude mcp add tvbox-check -e TVBOX_CHECK_LANG=en -- node /path/to/tvbox-check/packages/mcp/dist/index.js
```

## Réglages / Settings

- `TVBOX_CHECK_LANG` : `fr` ou `en` (défaut / default: `en`).
- `TVBOX_CHECK_OFFLINE=1` : aucun accès réseau, copie embarquée seulement / no network access, bundled copy only.
- `TVBOX_CHECK_DB_URL` : autre base, HTTPS / another HTTPS database (default: `https://tvbox-check.nm-labs.dev/data/db.json`).

## Données à jour / Up-to-date data

Au démarrage, le serveur répond tout de suite avec la copie embarquée, puis vérifie la base du site en arrière-plan (au démarrage et toutes les 6 h, avec `ETag`). La base reçue est validée par le schéma ; en cas d'erreur, les données précédentes sont conservées. Chaque réponse indique d'où viennent les données.
The server starts at once with the bundled copy, then checks the site's database in the background (at startup and every 6 h, with `ETag`). The database received is validated against the schema; on any error the previous data is kept. Every answer says where the data comes from.

## Sécurité / Security

- Outils en lecture seule, aucune commande exécutée ; seul accès réseau : une requête GET HTTPS vers la base du site / read-only tools, no command executed; the only network access is an HTTPS GET to the site's database.
- Les textes issus de pages tierces sont renvoyés comme des **données** ; le serveur le rappelle au client dans ses instructions / third-party texts are returned as **data**, and the server says so in its instructions.

## Contribuer / Contributing

Toute nouveauté est traduite en français et en anglais (`packages/core/src/messages.*.ts`, `labels.ts`). Voir / See [CONTRIBUTING.md](../../CONTRIBUTING.md).
