# Contribuer à tvbox-check

La base (`data/`) est ouverte. Une contribution passe par une **issue** (modèles fournis) ou par une **pull request** qui modifie les JSON.

## Le site est bilingue (français et anglais)

**Toute contribution doit être traduite.** La CI échoue sinon.

- **Données** : chaque texte français a son équivalent anglais (`notes_fr`/`notes_en`, `summary_fr`/`summary_en`, `note_fr`/`note_en`, `title`/`title_en`). Les deux sont renseignés ensemble ou vides ensemble.
- **Interface** : toute nouvelle chaîne va dans `apps/web/src/i18n/fr.ts` **et** `en.ts` (le type `Strings` empêche d'en oublier une). Aucun texte en dur dans les composants.
- **Moteur** : tout nouveau message de `packages/core` va dans `messages.fr.ts` **et** `messages.en.ts`.
- **Pages** : toute nouvelle page existe dans les deux langues (`pnpm i18n` le vérifie après le build).

Une traduction approximative est acceptée : elle sera relue. Une absence de traduction ne l'est pas.

## Règles sur les données

- Chaque valeur technique a une `basis` (`datasheet`, `vendor`, `community`, `hypothesis`), un `status` et des `sources`.
- `verified` : `datasheet` ou `vendor` (document lu), ou `corroborated` (au moins deux sources **indépendantes**, de domaines différents, qui disent la même chose, chacune lue). Une seule source communautaire donne `community` (verdict maximal « suspect »).
- `hypothesis` : valeur attendue non sourcée, aucun verdict. Ne rien inventer : sans source, mettre `null`.
- Un cas `confirmed` exige une preuve forte (`chip-photo`, `uart-log`, `f3-test`) et une source.
- Les listes sont triées par `id`. Les identifiants de sources existent dans `data/sources.json`.
- Résumez avec vos mots, jamais de copier-coller de forum. Vocabulaire neutre : « cas signalé », « écart observé ».

## Bien documenter un cas

- **Photos** : chaque puce de RAM et de stockage de face, sans reflet, marquage lisible, plus une vue d'ensemble.
- **Commandes sous Linux** :

  ```bash
  free -m
  lsblk
  dmesg | grep -i -E "memory|mmc|dram"
  ```

- **Source** : adresse exacte, titre, date de consultation, révision pour une datasheet.

## Développement

```bash
pnpm install
pnpm check       # lint, format, typecheck, validation des données, tests
pnpm schemas     # régénère data/schema/*.json
pnpm --filter @tvbox-check/web dev
```

Commits conventionnels (`feat:`, `fix:`, `data:`, `docs:`).

## Votre pull request

1. Forkez le dépôt, créez une branche, faites **un seul sujet** par PR.
2. Lancez `pnpm check` en local : la CI fait exactement les mêmes contrôles.
3. Ouvrez la PR en remplissant le modèle. Elle sera relue avec la grille publique [REVIEW.md](REVIEW.md).
4. Corrigez ce qui est demandé ; le mainteneur fusionne quand la CI est verte et la relecture favorable.

Des idées à prendre : [ROADMAP.md](ROADMAP.md). Règles de conduite : [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
