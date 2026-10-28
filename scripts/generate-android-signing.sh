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

set -euo pipefail

alias_name=${1:-souzi-release}
secrets_dir=".secrets"
keystore="$secrets_dir/android-release.jks"

mkdir -p "$secrets_dir"
chmod 700 "$secrets_dir"

if [[ -f "$keystore" ]]; then
  echo "Keystore already exists: $keystore"
  echo "Reuse it (do NOT delete it — losing it means users cannot update the app)."
else
  echo "Generating a new keystore…"
  keytool -genkeypair \
    -v \
    -keystore "$keystore" \
    -keyalg RSA -keysize 4096 -validity 18250 \
    -storetype JKS \
    -dname "CN=Souzi, OU=Personal, O=amoshydra, L=, S=, C=" \
    -alias "$alias_name"
fi

store_password=$(<"$secrets_dir/android-release.storepass")
if [[ -z "$store_password" ]]; then
  store_password=$(openssl rand -base64 24 | tr -d '\n')
  printf '%s' "$store_password" >"$secrets_dir/android-release.storepass"
  chmod 600 "$secrets_dir/android-release.storepass"
fi

key_password=$(<"$secrets_dir/android-release.keypass")
if [[ -z "$key_password" ]]; then
  key_password=$(openssl rand -base64 24 | tr -d '\n')
  printf '%s' "$key_password" >"$secrets_dir/android-release.keypass"
  chmod 600 "$secrets_dir/android-release.keypass"
fi

# The keytool prompt above may have set a store/key password already. If the
# user typed one interactively, reuse it; otherwise overwrite with generated.
# To avoid ambiguity for fresh keystores, re-set both passwords now.
keytool -storepasswd -keystore "$keystore" \
  -new "$store_password" -store "$store_password" >/dev/null 2>&1 || true
keytool -keypasswd -keystore "$keystore" \
  -alias "$alias_name" -store "$store_password" \
  -key "$store_password" -new "$key_password" >/dev/null 2>&1 || true

keystore_base64=$(base64 -w0 "$keystore" 2>/dev/null || base64 -i "$keystore" | tr -d '\n')

cat <<EOF

========================================================================
Add these four GitHub repository secrets (Settings → Secrets and
variables → Actions):

  ANDROID_KEYSTORE_BASE64   (base64 of keystore; same value below)
  ANDROID_KEYSTORE_PASSWORD $store_password
  ANDROID_KEY_ALIAS         $alias_name
  ANDROID_KEY_PASSWORD      $key_password

Keystore base64 (file: $keystore):
$keystore_base64

If you have the GitHub CLI installed you can set them directly:

  gh secret set ANDROID_KEYSTORE_BASE64 < .secrets/keystore.b64
  gh secret set ANDROID_KEYSTORE_PASSWORD --body '$store_password'
  gh secret set ANDROID_KEY_ALIAS --body '$alias_name'
  gh secret set ANDROID_KEY_PASSWORD --body '$key_password'

IMPORTANT: back up .secrets/android-release.jks plus the two password
files in a password manager. Losing the keystore permanently locks out
in-place app updates.
========================================================================
EOF

printf '%s' "$keystore_base64" >.secrets/keystore.b64
echo "Alternatively: the base64 was also saved to .secrets/keystore.b64"
