#!/usr/bin/env sh
set -eu

AUTH_USER="${ORION_AUTH_USER:-orion}"
PASSWORD_FILE="${ORION_AUTH_PASSWORD_FILE:-/run/secrets/orion_password.txt}"
OUTPUT_FILE="${ORION_AUTH_OUTPUT_FILE:-}"
HTPASSWD_FILE="/etc/nginx/.htpasswd"

trim_line() {
  # Remove CR/LF and surrounding spaces.
  printf "%s" "$1" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

read_password_file() {
  if [ -f "$1" ]; then
    # Use only the first line, trimmed.
    first_line="$(sed -n '1p' "$1" 2>/dev/null || true)"
    trim_line "$first_line"
  else
    printf ""
  fi
}

ensure_parent_dir() {
  d="$(dirname "$1")"
  if [ -n "$d" ] && [ "$d" != "." ]; then
    mkdir -p "$d"
  fi
}

generate_password() {
  # 24 chars, alnum only (safe for shells and copy/paste).
  openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c 1-24
}

PASS="$(read_password_file "$PASSWORD_FILE")"

if [ -z "$PASS" ] && [ -n "$OUTPUT_FILE" ]; then
  PASS="$(read_password_file "$OUTPUT_FILE")"
fi

if [ -z "$PASS" ]; then
  PASS="$(generate_password)"
  ensure_parent_dir "$PASSWORD_FILE"
  umask 077
  printf "%s\n" "$PASS" > "$PASSWORD_FILE"
fi

if [ -n "$OUTPUT_FILE" ] && [ ! -f "$OUTPUT_FILE" ]; then
  ensure_parent_dir "$OUTPUT_FILE"
  umask 077
  printf "%s\n" "$PASS" > "$OUTPUT_FILE"
fi

# Generate htpasswd on every start (idempotent).
htpasswd -bB -c "$HTPASSWD_FILE" "$AUTH_USER" "$PASS" >/dev/null 2>&1

echo "[orion] Basic auth enabled (user: $AUTH_USER). Password TXT: $PASSWORD_FILE"
if [ -n "$OUTPUT_FILE" ]; then
  echo "[orion] Password copy (backup): $OUTPUT_FILE"
fi
