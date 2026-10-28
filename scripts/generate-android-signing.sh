#!/usr/bin/env zsh
# Generates the Android release keystore and prints the GitHub Actions secrets.
#
# Run from the repository root:
#   scripts/generate-android-signing.sh [key-alias]
#
# Files land in .secrets/ (git-ignored). Copy the printed values into
# GitHub → Settings → Secrets and variables → Actions → New repository secret:
#   ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD,
#   ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
#
# This script never uses interactive prompts. It generates two random
# passwords itself and stores them under .secrets/.

set -euo pipefail

alias_name=${1:-souzi-release}
secrets_dir=".secrets"
keystore="$secrets_dir/android-release.keystore"
storepass_file="$secrets_dir/android-release.storepass"
keypass_file="$secrets_dir/android-release.keypass"

mkdir -p "$secrets_dir"
chmod 700 "$secrets_dir"

keystore_base64() {
  base64 -w0 "$keystore" 2>/dev/null || base64 -i "$keystore" | tr -d '\n'
}

if [[ -f "$keystore" ]]; then
  echo "Keystore already exists: $keystore — reusing it (do NOT delete it; losing it"
  echo "means users can no longer install app updates)."
  if [[ ! -f "$storepass_file" || ! -f "$keypass_file" ]]; then
    echo "ERROR: $storepass_file / $keypass_file are missing, so the existing"
    echo "keystore's passwords are unknown. Delete $keystore and rerun this script"
    echo "to regenerate a fresh keystore."
    exit 1
  fi
  store_password=$(>"$storepass_file" cat "$storepass_file")
  key_password=$(cat "$keypass_file")
else
  echo "Generating a new keystore…"
  store_password=$(openssl rand -base64 24 | tr -d '\n')
  key_password="$store_password"
  printf '%s' "$store_password" >"$storepass_file"
  printf '%s' "$key_password" >"$keypass_file"
  chmod 600 "$storepass_file" "$keypass_file"

  keytool -genkeypair \
    -v \
    -keystore "$keystore" \
    -storetype PKCS12 \
    -keyalg RSA -keysize 4096 -validity 18250 \
    -storepass "$store_password" \
    -keypass "$key_password" \
    -dname "CN=Souzi, OU=Personal, O=amoshydra, C=" \
    -alias "$alias_name" >/dev/null
  chmod 600 "$keystore"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git check-ignore -q "$keystore" || {
    echo "WARNING: $keystore is not git-ignored. Add it before committing!"
    exit 1
  }
fi

printf '%s' "$(keystore_base64)" >"$secrets_dir/keystore.b64"
chmod 600 "$secrets_dir/keystore.b64"

k64=$(cat "$secrets_dir/keystore.b64")

cat <<EOF

========================================================================
Keystore: $keystore
Alias:    $alias_name
Passwords saved to:
  $storepass_file
  $keypass_file

Add these four GitHub repository secrets (Settings → Secrets and
variables → Actions):

  ANDROID_KEYSTORE_BASE64   see .secrets/keystore.b64 (large, not printed)
  ANDROID_KEYSTORE_PASSWORD $store_password
  ANDROID_KEY_ALIAS         $alias_name
  ANDROID_KEY_PASSWORD      $key_password

If you have the GitHub CLI installed you can set them directly:

  gh secret set ANDROID_KEYSTORE_BASE64 < .secrets/keystore.b64
  gh secret set ANDROID_KEYSTORE_PASSWORD --body '$store_password'
  gh secret set ANDROID_KEY_ALIAS --body '$alias_name'
  gh secret set ANDROID_KEY_PASSWORD --body '$key_password'

IMPORTANT: back up $keystore plus the two password files in a password
manager. Losing the keystore permanently locks out in-place app updates
(users would need to uninstall/reinstall).
========================================================================
EOF
