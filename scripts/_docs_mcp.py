def edit(path, pairs):
    s = open(path, encoding="utf8").read()
    for old, new in pairs:
        assert old in s, (path, old[:60])
        s = s.replace(old, new, 1)
    open(path, "w", encoding="utf8").write(s)


edit(
    "README.md",
    [
        (
            "| `apps/web`       |",
            "| `packages/mcp`   | Connecteur MCP en lecture seule (`check_box`, `get_soc`, `get_model`, `search`), voir [packages/mcp](packages/mcp/README.md). |\n| `apps/web`       |",
        )
    ],
)
edit(
    "ROADMAP.md",
    [
        (
            "- **[code]** Connecteur MCP en lecture seule (`check_box`, `get_soc`, `get_model`, `search`) réutilisant `packages/core`, avec les messages dans les deux langues.\n",
            "- **[code]** Publier le connecteur MCP sur npm (`npx`) ; aujourd'hui il se construit depuis le dépôt.\n",
        )
    ],
)
edit(
    "CONTRIBUTING.md",
    [
        (
            "- **Moteur** : tout nouveau message de `packages/core` va dans `messages.fr.ts` **et** `messages.en.ts`.",
            "- **Moteur et connecteur MCP** : tout nouveau message de `packages/core` va dans `messages.fr.ts` **et** `messages.en.ts` ; tout nouveau libellé partagé dans `labels.ts` (les deux langues).",
        )
    ],
)
print("ok")
