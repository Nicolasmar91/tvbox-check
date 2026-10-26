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
- `TVBOX_CHECK_DB_URL` : facultatif / optional. HTTPS URL of an up-to-date database, e.g. `https://tvbox-check.nm-labs.dev/data/db.json`. Validated against the schema; falls back to the bundled data on any failure. Sans cette variable, aucun accès réseau / without it, no network access.

## Sécurité / Security

- Outils en lecture seule, aucune commande exécutée / read-only tools, no command executed.
- Les textes issus de pages tierces sont renvoyés comme des **données** ; le serveur le rappelle au client dans ses instructions / third-party texts are returned as **data**, and the server says so in its instructions.

## Contribuer / Contributing

Toute nouveauté est traduite en français et en anglais (`packages/core/src/messages.*.ts`, `labels.ts`). Voir / See [CONTRIBUTING.md](../../CONTRIBUTING.md).
