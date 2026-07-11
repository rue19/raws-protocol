#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

KEY_FILE="$ROOT_DIR/.secrets.key"
ENCRYPTED_FILES=(
  "contracts/.env.enc"
  "keeper/.env.enc"
  "frontend/.env.local.enc"
)
PLAINTEXT_FILES=(
  "contracts/.env"
  "keeper/.env"
  "frontend/.env.local"
)

usage() {
  echo "Usage: $0 {encrypt|decrypt}"
  echo ""
  echo "  encrypt  - Encrypt .env files to .env.enc (removes plaintext)"
  echo "  decrypt  - Decrypt .env.enc files to .env (for local development)"
  echo ""
  echo "The encryption key is stored in .secrets.key (gitignored)."
  exit 1
}

generate_key() {
  if [ ! -f "$KEY_FILE" ]; then
    echo "Generating new encryption key..."
    openssl rand -hex 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    echo "Key saved to $KEY_FILE"
  fi
}

do_encrypt() {
  generate_key
  KEY=$(cat "$KEY_FILE")

  for i in "${!ENCRYPTED_FILES[@]}"; do
    enc_file="$ROOT_DIR/${ENCRYPTED_FILES[$i]}"
    plain_file="$ROOT_DIR/${PLAINTEXT_FILES[$i]}"

    if [ -f "$plain_file" ]; then
      openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$plain_file" \
        -out "$enc_file" \
        -pass pass:"$KEY"
      rm "$plain_file"
      echo "Encrypted: ${PLAINTEXT_FILES[$i]} -> ${ENCRYPTED_FILES[$i]}"
    else
      echo "Skipped (not found): ${PLAINTEXT_FILES[$i]}"
    fi
  done

  echo ""
  echo "Done. Plaintext .env files removed. Use '$0 decrypt' to restore."
}

do_decrypt() {
  if [ ! -f "$KEY_FILE" ]; then
    echo "Error: $KEY_FILE not found. Cannot decrypt."
    exit 1
  fi

  KEY=$(cat "$KEY_FILE")

  for i in "${!ENCRYPTED_FILES[@]}"; do
    enc_file="$ROOT_DIR/${ENCRYPTED_FILES[$i]}"
    plain_file="$ROOT_DIR/${PLAINTEXT_FILES[$i]}"

    if [ -f "$enc_file" ]; then
      openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 \
        -in "$enc_file" \
        -out "$plain_file" \
        -pass pass:"$KEY"
      chmod 600 "$plain_file"
      echo "Decrypted: ${ENCRYPTED_FILES[$i]} -> ${PLAINTEXT_FILES[$i]}"
    else
      echo "Skipped (not found): ${ENCRYPTED_FILES[$i]}"
    fi
  done

  echo ""
  echo "Done. Plaintext .env files restored."
}

case "${1:-}" in
  encrypt) do_encrypt ;;
  decrypt) do_decrypt ;;
  *) usage ;;
esac
