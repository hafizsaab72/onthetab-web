#!/bin/bash
#
# Publishes the OnTheTab site at
#   https://xeca-ai.tech/onthetab/          (home)
#   https://xeca-ai.tech/onthetab/privacy
#   https://xeca-ai.tech/onthetab/terms
#   https://xeca-ai.tech/onthetab/support
#   https://xeca-ai.tech/onthetab/g?t=<token>  (read-only group page)
# Run on the server (syed@187.124.96.129) from the uploaded folder; the site
# files sit one folder up, as in the repo. Safe to run again to update.
#
# nginx serves the files itself; the Xeca Next.js app, the Quran app's pages
# and RideBuddy's pages are not touched.
# To undo: remove the "include snippets/onthetab-site.conf;" line from the site
# config, then sudo nginx -t && sudo systemctl reload nginx.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$HERE/.."
WEB_ROOT=/var/www/onthetab-site
SNIPPET=/etc/nginx/snippets/onthetab-site.conf
SITE="$(readlink -f /etc/nginx/sites-enabled/xeca-ai.tech)"

# The group page needs the hosted anon key in config.js before it can work.
if grep -q "PASTE_SUPABASE_ANON_KEY_HERE" "$SRC/config.js"; then
  echo "Note: config.js still has the anon key placeholder; /onthetab/g will say it isn't set up yet." >&2
fi

sudo mkdir -p "$WEB_ROOT/assets"
for f in index.html privacy.html terms.html support.html styles.css app.js g.html g.css g.js config.js; do
  sudo install -m 644 "$SRC/$f" "$WEB_ROOT/$f"
done
for f in "$SRC"/assets/*; do
  sudo install -m 644 "$f" "$WEB_ROOT/assets/$(basename "$f")"
done
sudo install -m 644 "$HERE/onthetab-site.conf" "$SNIPPET"

if ! sudo grep -q "snippets/onthetab-site.conf" "$SITE"; then
  BACKUP="/etc/nginx/xeca-ai.tech.bak-$(date +%Y%m%d-%H%M%S)"
  sudo cp "$SITE" "$BACKUP"
  # Add the include to the first server block (the HTTPS one), after server_name.
  sudo awk '{ print } !done && /^[[:space:]]*server_name xeca-ai.tech/ { print "    include snippets/onthetab-site.conf;"; done = 1 }' "$BACKUP" | sudo tee "$SITE" > /dev/null
  if ! sudo nginx -t; then
    sudo cp "$BACKUP" "$SITE"
    echo "nginx rejected the change; the original config is restored." >&2
    exit 1
  fi
  echo "Backup of the old config: $BACKUP"
fi

sudo nginx -t
sudo systemctl reload nginx
echo "Live: https://xeca-ai.tech/onthetab/ and /onthetab/privacy, /onthetab/terms, /onthetab/support, /onthetab/g"
