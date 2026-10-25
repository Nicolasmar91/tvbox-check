#!/usr/bin/env bash
# Provisionnement initial de tvbox-check sur le VPS partagé (Rexact,
# ticket-recette, PlainSearch). À lancer UNE SEULE FOIS, via sudo, depuis le
# dépôt cloné dans /home/debian/tvbox-check.
#
# Différences volontaires avec Rexact : site statique, donc pas de Node, pas de
# base de données, pas de service systemd. Le build se fait dans GitHub Actions
# et le résultat est copié ici par rsync ; le VPS ne compile rien.
#
# - Le Caddyfile est PARTAGÉ : ce script AJOUTE le bloc de tvbox-check
#   (deploy/Caddyfile.tvbox-check) sans écraser le reste, et valide la config
#   avant de recharger Caddy — une erreur ne doit jamais casser les autres sites.
# - Les fichiers servis vivent dans /var/www/tvbox-check (pas dans /home) : Caddy
#   peut les lire sans qu'on ouvre le dossier personnel.
#
# Usage : sudo DOMAIN=tvbox-check.nm-labs.dev bash deploy/setup-vps.sh

set -euo pipefail

DEPLOY_USER="${SUDO_USER:-$(whoami)}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${DOMAIN:?Définis DOMAIN=tvbox-check.nm-labs.dev avant de lancer ce script}"
SITE_DIR="/var/www/tvbox-check"
CADDYFILE="/etc/caddy/Caddyfile"

echo "==> Utilisateur de déploiement : $DEPLOY_USER"
echo "==> Domaine                    : $DOMAIN"
echo "==> Dossier servi              : $SITE_DIR"

# ---------- Dossiers ----------
mkdir -p "$SITE_DIR/releases"
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$SITE_DIR"
chmod 755 /var/www "$SITE_DIR"

# Page d'attente tant que le premier déploiement n'a pas eu lieu : Caddy a
# besoin que `current` existe pour valider/recharger sans erreur.
if [[ ! -e "$SITE_DIR/current" ]]; then
  mkdir -p "$SITE_DIR/releases/initial"
  cat > "$SITE_DIR/releases/initial/index.html" <<'HTML'
<!doctype html><html lang="fr"><meta charset="utf-8"><title>tvbox-check</title>
<p>Site en cours de déploiement.</p></html>
HTML
  chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$SITE_DIR/releases/initial"
  ln -sfn "releases/initial" "$SITE_DIR/current"
  chown -h "$DEPLOY_USER":"$DEPLOY_USER" "$SITE_DIR/current"
fi

# ---------- Bloc Caddy (ajouté, jamais écrasé) ----------
# Le fichier de log doit appartenir à `caddy` : `caddy validate` lancé en root le
# crée sinon avec root comme propriétaire, et le service (utilisateur caddy) ne
# peut plus l'ouvrir au rechargement ("permission denied"). Même piège que Rexact.
LOG_FILE="/var/log/caddy/tvbox-check-access.log"
fix_log_owner() {
  mkdir -p /var/log/caddy
  touch "$LOG_FILE"
  chown caddy:caddy "$LOG_FILE"
}
fix_log_owner
if grep -q "tvbox-check-access.log" "$CADDYFILE" 2>/dev/null; then
  echo "==> Bloc Caddy tvbox-check déjà présent, rien à ajouter."
else
  echo "==> Ajout du bloc Caddy dans $CADDYFILE (sauvegarde : $CADDYFILE.bak-tvbox-check)"
  cp "$CADDYFILE" "$CADDYFILE.bak-tvbox-check"
  {
    echo ""
    sed "s/__DOMAIN__/$DOMAIN/g" "$PROJECT_DIR/deploy/Caddyfile.tvbox-check"
  } >> "$CADDYFILE"
  if ! caddy validate --config "$CADDYFILE" --adapter caddyfile; then
    echo "!! Config Caddy invalide : je restaure la sauvegarde, rien n'est rechargé." >&2
    cp "$CADDYFILE.bak-tvbox-check" "$CADDYFILE"
    exit 1
  fi
fi

# Remis aux bonnes permissions juste avant le reload, quoi qu'ait fait `validate`.
fix_log_owner

echo "==> Rechargement de Caddy (reload : aucune coupure pour les autres sites)..."
if ! RELOAD_OUTPUT=$(systemctl reload caddy 2>&1); then
  echo "!! Le rechargement de Caddy a échoué. Les sites déjà en ligne continuent de tourner" >&2
  echo "!! avec l'ancienne configuration. Détail : journalctl -xeu caddy.service" >&2
  echo "$RELOAD_OUTPUT" >&2
  exit 1
fi

echo ""
echo "==> Terminé. Prochaines étapes :"
echo "    1. Vérifier que le DNS de $DOMAIN pointe vers ce VPS."
echo "    2. Ajouter la clé publique de déploiement dans ~/.ssh/authorized_keys"
echo "       (voir deploy/README.md), puis les secrets dans GitHub."
echo "    3. Pousser sur main : le workflow CI déploie automatiquement."
