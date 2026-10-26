# Idées à prendre

Choisissez une idée, ouvrez une issue pour dire que vous la prenez, puis proposez une PR. Les niveaux : **[données]** sans code, **[contenu]** rédaction, **[code]** développement.

## Données

- **[données]** Datasheet officielle pour un SoC resté « communautaire » : S905W, S905X2, S912, H3, H616, RK3229, RK3228A. Il faut une datasheet **lue**, avec sa révision.
- **[données]** Lever la contradiction sur la RAM maximale du H6 (2 Go d'espace d'adressage selon la datasheet, 3 Go selon les forums).
- **[données]** Ajouter des SoC fréquents : S905L, S905D, S922X, RK3399, H618, H313 (limite de RAM à sourcer).
- **[données]** Documenter un cas avec des **preuves fortes** : photos des puces, log UART, test f3 ou H2testw.
- **[données]** Ajouter une source qui confirme ou contredit un cas existant.

## Contenu

- **[contenu]** Relire le guide « vérifier les vraies specs » et signaler ce qui est faux ou flou.
- **[contenu]** Ajouter une troisième langue (espagnol, allemand…) : dictionnaire dans `apps/web/src/i18n/`, messages du moteur dans `packages/core/src/`, champs `_xx` des données.
- **[contenu]** Relire les traductions anglaises existantes (elles ont été rédigées d'après le français).
- **[code]** Connecteur MCP en lecture seule (`check_box`, `get_soc`, `get_model`, `search`) réutilisant `packages/core`, avec les messages dans les deux langues.
- **[contenu]** Ajouter au guide la lecture des puces mémoire courantes (Samsung, Micron, SK hynix) avec des exemples de références.

## Code

- **[code]** Mesurer Lighthouse mobile (cible ≥ 95) et corriger ce qui bloque.
- **[code]** Tests de parcours (Playwright) : saisie, verdict, URL partageable.
- **[code]** Vérification de types des pages `.astro` (l'outil `astro check` ne fonctionne pas encore avec Astro 7).
- **[code]** Diagnostic DTB et bootloader : détecter le matériel mal ou pas exploité (RAM, Ethernet, CPU) à partir d'un rapport et d'un `.dtb`, traités dans le navigateur. Cahier des charges : [docs/issues/diagnostic-dtb-bootloader.md](docs/issues/diagnostic-dtb-bootloader.md).
- **[données]** Alimenter la future base des DTB connus (`data/dtbs.json`) : carte, fichier, DTB recommandé, sources.
- **[code]** Scanner en ligne de commande (niveau 2) qui produit un `Report` (schéma déjà défini dans `packages/core`).
- **[code]** Import d'un rapport AIDA64 ou Termux (niveau 3).
- **[code]** Compteurs de votes « moi aussi » par modèle (Worker Cloudflare), en gardant le site statique par défaut.
