# tvbox-check

**Les specs de votre TV box sont-elles possibles ? Vérifiez, et aidez à construire la base ouverte qui répond à cette question.**

Beaucoup de TV box Android bon marché affichent de fausses specs : RAM, stockage, parfois le SoC. Le firmware est modifié pour mentir, et la vraie information est éparpillée dans des fils de forum (Armbian, CoreELEC, LibreELEC…). tvbox-check la rassemble, avec ses sources.

Un projet [NM Labs](https://nm-labs.fr). Site en français, code MIT, données CC BY 4.0.

## Ce que fait le site

Vous saisissez ce que le vendeur annonce (modèle, SoC, RAM, Ethernet, vidéo). Le site répond :

| Verdict        | Signification                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Impossible** | L'annonce dépasse une limite du SoC **vérifiée** : datasheet constructeur, ou au moins deux sources indépendantes qui concordent. |
| **Suspect**    | L'annonce dépasse une limite issue de retours communautaires, ou le modèle est un cas déjà signalé.                               |
| **Inconnu**    | Les données connues ne permettent pas de conclure.                                                                                |
| **Plausible**  | Aucune impossibilité détectée. **Cela ne prouve jamais qu'une box est authentique.**                                              |

Chaque valeur affichée indique sa **source** et sa **base** : datasheet, fiche constructeur, retours de la communauté, ou hypothèse non sourcée (aucun verdict).

## Pourquoi c'est fiable

- **Pas de donnée sans source.** Sans source, la valeur est `null`, jamais inventée.
- **`impossible` exige une preuve solide** : une datasheet ou fiche constructeur lue, ou au moins deux sources indépendantes (domaines différents) qui disent la même chose. Une seule source communautaire plafonne à `suspect`.
- **Aucune accusation.** Les cas sont des observations sourcées, résumées avec nos mots, sans nommer de vendeur.
- **Site 100 % statique**, sans cookie ni traceur. Le moteur de règles tourne dans votre navigateur.

## Démarrer en deux minutes

```bash
git clone <url-du-depot>
cd tvbox-check
pnpm install
pnpm --filter @tvbox-check/web dev   # le site sur http://localhost:4321
pnpm check                           # lint, format, types, données, tests, build
```

Prérequis : Node 24 et pnpm 9.

## Comment le dépôt est organisé

| Dossier         | Contenu                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `data/`         | La base ouverte : `socs.json`, `cases.json`, `sources.json` (+ JSON Schema).     |
| `packages/core` | Schémas Zod, moteur de règles pur, validation. Réutilisable (futur scanner CLI). |
| `apps/web`      | Le site Astro : vérificateur, fiches SoC et modèles, recherche, guide.           |

## Participer

Tout le monde peut proposer des améliorations par **pull request**. Trois façons de contribuer, de la plus simple à la plus technique :

1. **Les données** : ajouter un cas observé, un SoC, une datasheet, une source plus solide. Un éditeur de texte suffit.
2. **Le contenu** : améliorer le guide, relire les textes, traduire en anglais.
3. **Le code** : le site, le moteur de règles, l'accessibilité, les tests.

Les idées prêtes à prendre sont dans [ROADMAP.md](ROADMAP.md). Les règles sont dans [CONTRIBUTING.md](CONTRIBUTING.md).

### Ce qui se passe quand vous ouvrez une PR

1. **La CI se lance seule** : lint, format, types, validation de toutes les données (sources existantes, ids uniques, tri), tests, build du site.
2. **Une relecture suit**, selon la grille publique [REVIEW.md](REVIEW.md) : sources, vocabulaire neutre, règles `verified` et `confirmed`, tests, périmètre.
3. **Le mainteneur fusionne** une fois la CI verte et la relecture favorable.

Les PR de données n'ont pas besoin de savoir coder : la CI vous dit exactement ce qui manque.

## Feuille de route

- Compléter les datasheets manquantes (S905W, S905X2, S912, H3, H616, RK3229…).
- Documenter plus de cas avec des preuves fortes (photos des puces, logs UART, tests de stockage).
- Version anglaise du site.
- Scanner en ligne de commande (niveau 2) et import de rapports AIDA64/Termux (niveau 3).

## Licences et éthique

- Code : [MIT](LICENSE). Données : [CC BY 4.0](DATA_LICENSE.md), attribution « tvbox-check / NM Labs ».
- Les noms de marques et de modèles sont cités à titre d'identification uniquement.
- Une correction ou un retrait peut être demandé à tout moment, voir la page « À propos » du site.
