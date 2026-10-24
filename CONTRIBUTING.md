# Contribuer à tvbox-check

La base (`data/`) est ouverte. Une contribution passe par une **issue** (modèles fournis) ou par une **pull request** qui modifie les JSON.

## Règles sur les données

- Chaque valeur technique a une `basis` (`datasheet`, `vendor`, `community`, `hypothesis`), un `status` et des `sources`.
- `verified` : uniquement `datasheet` ou `vendor`, document lu. Les retours de forum donnent `community` (verdict maximal « suspect »).
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
