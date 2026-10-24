# tvbox-check

Vérificateur de specs de TV box Android (projet NM Labs). Il détecte des **impossibilités** (ex. 4 Go de RAM annoncés sur un SoC limité à 2 Go) et des **cas documentés** ; il ne prouve jamais qu'une box est authentique.

- `packages/core` : schémas Zod, moteur de règles pur (réutilisable par un futur scanner CLI).
- `apps/web` : site statique Astro (Phase 2, à venir).
- `data/` : base JSON ouverte (SoC, cas, sources). Chaque valeur a une source et un statut `verified` / `unverified`.

## Commandes

```bash
pnpm install
pnpm check      # lint + format + typecheck + validation des données + tests
pnpm schemas    # régénère data/schema/*.json
```

## Licences

Code : MIT (`LICENSE`). Données : CC BY 4.0 (`DATA_LICENSE.md`).
