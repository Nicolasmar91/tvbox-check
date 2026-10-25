# Diagnostic DTB et bootloader : matériel mal ou pas exploité

> Brouillon d'issue, à publier une fois le dépôt créé. Étiquettes suggérées : `idée`, `code`, `données`.

## Problème

Une box peut être authentique mais mal exploitée : un DTB inadapté bride la RAM, le PHY Ethernet, le CPU ou l'eMMC. Aujourd'hui, rien n'aide à comprendre l'écart entre ce que le matériel sait faire et ce que le système utilise.

## Idée

Comparer, **dans le navigateur**, un rapport de la box (et éventuellement son fichier `.dtb`) avec les capacités connues du SoC, puis proposer un diagnostic et une piste de correction.

Nouveau verdict, distinct des verdicts de fraude : **« sous-exploité »** ou **« mal configuré »**. Un écart de DTB ne prouve jamais une fraude.

## Trois couches à lire (et à ne pas confondre)

1. **Bootloader (u-boot)** : détecte la DRAM et la transmet au noyau. Sur plusieurs box (X96 mini, H96 Pro Plus), la RAM visible dépend de lui, pas du DTB.
2. **DTB** : décrit le matériel au noyau (nœud `memory`, PHY Ethernet, OPP du CPU, modes eMMC, USB).
3. **Noyau** : ce qui est réellement utilisé (`free -m`, `ethtool`, `cpufreq`).

### Comment lire la couche bootloader

- **Depuis Linux, sans outil spécial** : le bootloader corrige le nœud mémoire du DTB avant de lancer le noyau. Donc `/proc/device-tree/memory*/reg` et `/proc/iomem` (lignes `System RAM`) reflètent ce qu'il a détecté.
- **Journal UART** : la ligne de détection de la DRAM s'affiche avant le noyau (preuve forte, voir le guide).
- **Variables u-boot** : `fw_printenv` si l'environnement est lisible ; sinon à relever sur l'UART.
- **Image du bootloader** (optionnel, avancé) : le début de l'eMMC ou `boot0` peut être lu pour identifier la version et la table DDR. À traiter avec prudence (ne jamais écrire sur ces zones).

Le site ne lit rien lui-même : l'utilisateur colle des sorties de commandes ou dépose des fichiers, **traités localement, sans envoi**.

## Périmètre de la première version

- Entrées : sorties collées (`free -m`, `/proc/iomem`, `ethtool eth0`, `lscpu`/`cpufreq`) et fichier `.dtb` facultatif.
- Contrôles : **RAM, Ethernet, CPU** uniquement.
- Familles : **S905W, RK322x, RK3318**.
- Sortie : diagnostic par critère, niveau de confiance, piste de correction (autre DTB, option de bootloader, overlay).

## Données à ajouter

- Capacités par SoC : cœurs, fréquence maximale, modes eMMC, USB 3.0 (même règle de sources et de statuts que l'existant).
- Base des DTB connus (`data/dtbs.json`) : carte, fichier, ce qu'il déclare, DTB recommandé, sources.

## Critères d'acceptation

- [ ] Un rapport + un `.dtb` produisent un diagnostic sans aucune requête réseau.
- [ ] Le moteur reste pur dans `packages/core`, avec des tests par règle.
- [ ] Un écart n'est jamais présenté comme une preuve de fraude.
- [ ] Chaque piste de correction cite une source.
- [ ] Les textes sont dans `apps/web/src/i18n/`.
