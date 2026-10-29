#!/usr/bin/env bash
# «Посевная» на своём сервере для Telegram Mini App.
# Чистый Ubuntu или Debian, запуск от root:
#   curl -fsSL https://raw.githubusercontent.com/MrDuncan-lab/Game_sowing-campaign/main/deploy/setup.sh | sudo bash
# Своё имя вместо <ip>.sslip.io и почта для Let's Encrypt (обе необязательны):
#   curl -fsSL …/setup.sh | sudo DOMAIN=game.example.ru EMAIL=me@example.ru bash
# Повторный запуск безопасен: обновит игру и конфиг, сертификат не перевыпустит без нужды.
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/MrDuncan-lab/Game_sowing-campaign/main"
WEBROOT=/var/www/posevnaya
SITE=/etc/nginx/sites-available/posevnaya

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!!! %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || fail "Нужен root: запустите через sudo."
command -v apt-get >/dev/null || fail "Скрипт рассчитан на Ubuntu/Debian (apt)."

say "Ставлю nginx и certbot"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx curl ca-certificates >/dev/null

say "Определяю адрес сервера"
IP="$(curl -4 -fsS --max-time 10 https://api.ipify.org || curl -4 -fsS --max-time 10 https://ifconfig.me || true)"
[ -n "$IP" ] || fail "Не удалось узнать внешний IPv4 сервера."
echo "Внешний IP: $IP"
CANDIDATES=()
if [ -n "${DOMAIN:-}" ]; then CANDIDATES=("$DOMAIN"); else
  DASHED="${IP//./-}"
  CANDIDATES=("$DASHED.sslip.io" "$DASHED.nip.io")
fi

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  say "Открываю 80 и 443 в ufw"
  ufw allow 'Nginx Full' >/dev/null
fi

install_update() {
  cat > /usr/local/bin/posevnaya-update <<EOF
#!/usr/bin/env bash
# Скачать свежую сборку «Посевной» из main и выложить без простоя.
set -euo pipefail
TMP="\$(mktemp)"
curl -fsSL --retry 3 -o "\$TMP" "$REPO_RAW/posevnaya-preview.html"
SIZE=\$(stat -c %s "\$TMP")
[ "\$SIZE" -gt 1000000 ] && grep -q 'Посевная' "\$TMP" || { echo "Скачанный файл не похож на игру (\$SIZE байт)"; rm -f "\$TMP"; exit 1; }
install -d -m 755 "$WEBROOT"
gzip -9 -c "\$TMP" > "$WEBROOT/index.html.gz.new"
install -m 644 "\$TMP" "$WEBROOT/index.html.new"
chmod 644 "$WEBROOT/index.html.gz.new"
mv -f "$WEBROOT/index.html.new" "$WEBROOT/index.html"
mv -f "$WEBROOT/index.html.gz.new" "$WEBROOT/index.html.gz"
rm -f "\$TMP"
echo "Игра обновлена: \$(date '+%F %T'), \$((SIZE/1024)) КБ"
EOF
  chmod 755 /usr/local/bin/posevnaya-update
}

say "Скачиваю игру с GitHub"
install_update
/usr/local/bin/posevnaya-update

write_site() {
  local name="$1" v6=""
  [ -e /proc/net/if_inet6 ] && v6="listen [::]:80;"
  cat > "$SITE" <<EOF
server {
    listen 80;
    $v6
    server_name $name;
    root $WEBROOT;
    index index.html;

    # 11 МБ HTML с картинками внутри: отдаём заранее сжатый .gz (≈6 МБ)
    gzip_static on;
    gzip on;
    gzip_types text/css application/javascript;

    location / {
        try_files \$uri /index.html;
        # Telegram держит WebView долго: каждый раз сверяемся по ETag, чтобы обновление приходило сразу
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        # X-Frame-Options не ставим: web.telegram.org открывает мини-апп во фрейме
    }
}
EOF
  ln -sf "$SITE" /etc/nginx/sites-enabled/posevnaya
  nginx -t >/dev/null 2>&1 || { nginx -t; fail "Ошибка в конфиге nginx."; }
  systemctl reload nginx || systemctl restart nginx
}

DOMAIN_OK=""
for name in "${CANDIDATES[@]}"; do
  say "Пробую имя $name"
  write_site "$name"
  curl -fsS --max-time 10 -o /dev/null "http://$name/" \
    || echo "Внимание: http://$name/ не открылся с самого сервера. Если certbot ниже упадёт — откройте порт 80 в панели хостинга."
  CERT_ARGS=(--nginx -d "$name" --non-interactive --agree-tos --redirect --keep-until-expiring)
  if [ -n "${EMAIL:-}" ]; then CERT_ARGS+=(--email "$EMAIL"); else CERT_ARGS+=(--register-unsafely-without-email); fi
  if certbot "${CERT_ARGS[@]}"; then DOMAIN_OK="$name"; break; fi
  echo "Сертификат для $name не выпустился, пробую следующее имя."
done
[ -n "$DOMAIN_OK" ] || fail "HTTPS не настроился. Чаще всего закрыт порт 80 или 443 в панели хостинга (firewall / security group)."

say "Проверяю HTTPS"
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$DOMAIN_OK/")
[ "$CODE" = 200 ] || fail "https://$DOMAIN_OK/ ответил $CODE"
GZ=$(curl -s -H 'Accept-Encoding: gzip' -o /dev/null -w '%{size_download}' --max-time 60 "https://$DOMAIN_OK/")
echo "Отдаётся $((GZ/1024)) КБ сжатыми."

echo "$DOMAIN_OK" > "$WEBROOT/.domain"
cat <<EOF

────────────────────────────────────────────────────────
 Готово. Адрес игры для BotFather:

   https://$DOMAIN_OK/

 Обновить игру после нового коммита в main:
   sudo posevnaya-update
 Сертификат продлевается сам (certbot.timer).
────────────────────────────────────────────────────────
EOF
