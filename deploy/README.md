# Déploiement de tvbox-check

Site statique : GitHub Actions construit le site, puis le copie sur le VPS par `rsync` sur SSH. Le VPS ne compile rien (pas de Node nécessaire). Caddy sert `/var/www/tvbox-check/current`, un lien symbolique basculé à chaque déploiement.

```
push sur main → CI verte → build → rsync vers releases/<sha>/ → bascule de `current` → anciennes releases purgées
```

## 1. Une seule fois sur le VPS

```bash
cd /home/debian
git clone https://github.com/Nicolasmar91/tvbox-check.git
cd tvbox-check
sudo DOMAIN=tvbox-check.nm-labs.dev bash deploy/setup-vps.sh
```

Le script crée `/var/www/tvbox-check`, ajoute le bloc Caddy sans écraser les autres sites, valide la config puis recharge Caddy. Il restaure la sauvegarde si la config est invalide.

Le DNS de `tvbox-check.nm-labs.dev` doit pointer vers le VPS **avant** le premier chargement du site (Caddy obtient le certificat via http-01, port 80 ouvert). Si le DNS passe par Cloudflare, mets l'enregistrement en **« DNS only »** (nuage gris) le temps d'obtenir le certificat.

## 2. Clé SSH dédiée au déploiement

Sur ton PC (pas sur le VPS) :

```bash
ssh-keygen -t ed25519 -f tvbox-check-deploy -C "tvbox-check-deploy" -N ""
```

Cela crée `tvbox-check-deploy` (clé **privée**) et `tvbox-check-deploy.pub` (clé publique).

Sur le VPS, ajoute la clé **publique** à `~/.ssh/authorized_keys` de l'utilisateur `debian`, avec l'option `restrict` (pas de terminal, pas de redirection de port) :

```
restrict ssh-ed25519 AAAA... tvbox-check-deploy
```

Récupère aussi l'empreinte du serveur, pour que GitHub vérifie qu'il parle au bon VPS (remplace `HOTE`) :

```bash
ssh-keyscan -t ed25519 HOTE
```

## 3. Secrets et variable GitHub

Dans `Settings → Secrets and variables → Actions` du dépôt `tvbox-check` :

| Type     | Nom               | Valeur                                                                  |
| -------- | ----------------- | ----------------------------------------------------------------------- |
| Secret   | `VPS_HOST`        | nom d'hôte ou IP du VPS                                                 |
| Secret   | `VPS_USER`        | `debian`                                                                |
| Secret   | `VPS_SSH_KEY_B64` | clé privée en base64, une seule ligne : `base64 -w0 tvbox-check-deploy` |
| Secret   | `VPS_KNOWN_HOSTS` | la ligne obtenue avec `ssh-keyscan`                                     |
| Variable | `DEPLOY_ENABLED`  | `true` (onglet **Variables**, à activer en dernier)                     |

Tant que `DEPLOY_ENABLED` n'est pas `true`, la CI tourne mais ne déploie pas. Après avoir enregistré la clé, supprime le fichier privé de ton PC.

## 4. Vérifier

- Le push suivant sur `main` lance le déploiement (onglet **Actions**, travail `deploy`).
- Sur le VPS : `ls -l /var/www/tvbox-check` montre `current` pointant vers `releases/<sha>`.

## Revenir en arrière

```bash
cd /var/www/tvbox-check
ls releases                       # releases conservées (les 3 dernières)
ln -sfn releases/<ancien-sha> current
```

## Annexe : équivalents Linux / MobaXterm

Les commandes PowerShell du guide ont ces équivalents dans un shell Linux :

```bash
ssh-keygen -t ed25519 -f ~/tvbox-check-deploy -C tvbox-check-deploy   # génère la paire de clés
cat ~/tvbox-check-deploy.pub                                           # clé publique à ajouter sur le VPS
base64 -w0 ~/tvbox-check-deploy; echo                                  # clé privée en une ligne, à coller dans VPS_SSH_KEY_B64
rm ~/tvbox-check-deploy ~/tvbox-check-deploy.pub                       # à faire une fois le secret enregistré
```
