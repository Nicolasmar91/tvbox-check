# Grille de relecture des pull requests

Chaque PR est relue avec cette grille, que tout le monde peut consulter. Le mainteneur fusionne ; la relecture ne remplace pas la CI, elle la complète.

## 1. Automatique (la CI doit être verte)

`pnpm check` : lint, format, typecheck, validation des données, tests, build.

## 2. Données (`data/`)

- [ ] Chaque valeur ajoutée a des `sources` qui existent dans `data/sources.json`.
- [ ] **`verified`** : la `basis` est `datasheet` ou `vendor` (document **lu** : l'adresse mène bien à la datasheet, la valeur y figure, la révision est indiquée), ou `corroborated` (au moins deux sources de domaines différents, chacune lue, qui disent bien la même valeur et ne se recopient pas).
- [ ] **`community`** : forum ou article réel, résumé fidèle, jamais présenté comme une certitude.
- [ ] **`hypothesis`** : valeur attendue, sans source, aucun verdict. Mettre `null` si on ne sait pas.
- [ ] **Cas `confirmed`** : au moins une preuve forte (`chip-photo`, `uart-log`, `f3-test`) et une source.
- [ ] Les contradictions entre sources sont signalées dans `community_findings`, pas masquées.
- [ ] Une valeur ne passe pas `verified` parce qu'« on la connaît » : sans document lu ni deux sources indépendantes concordantes, elle reste non vérifiée.

## 3. Traduction (français et anglais)

- [ ] Chaque texte français ajouté a son équivalent anglais (`*_en`), fidèle au sens et au niveau de prudence du français.
- [ ] Les nouvelles chaînes d'interface et messages du moteur existent dans les deux langues.
- [ ] `pnpm i18n` passe : chaque page existe en français et en anglais.

## 4. Texte et éthique

- [ ] Résumé avec les mots du contributeur, **pas de copier-coller** de forum ou de datasheet.
- [ ] Vocabulaire neutre : « cas signalé », « écart observé ». Jamais « arnaque », « escroc », ni nom de vendeur individuel.
- [ ] Pas de donnée personnelle (email, nom, adresse) dans les fichiers ou les logs joints.
- [ ] Photos et captures : uniquement celles du contributeur ou libres de droits.

## 5. Code

- [ ] Un test accompagne tout changement du moteur de règles (`packages/core`) ; le moteur reste pur, sans dépendance navigateur.
- [ ] Les textes de l'interface restent dans `apps/web/src/i18n/`, pas en dur dans les composants.
- [ ] Le verdict ne repose jamais sur la couleur seule ; les formulaires gardent leurs `label`.
- [ ] Aucune requête réseau à l'exécution, aucun cookie, aucun traceur tiers.
- [ ] Pas de nouvelle dépendance sans justification (poids, licence, maintenance).
- [ ] Pas de script ou de commande exécutés à l'installation qui sortent du périmètre de la PR.

## 6. Périmètre

- [ ] La PR fait une chose. Les gros changements se discutent d'abord dans une issue.
- [ ] Le message de PR explique le pourquoi, pas seulement le quoi.

## Issue de la relecture

- **Approuvée** : tout est coché, ou les réserves sont mineures.
- **Modifications demandées** : la relecture liste ce qui manque, point par point, avec la règle concernée.
- **Refusée** : hors périmètre ou contraire aux principes (accusation, donnée sans source, tracking).
