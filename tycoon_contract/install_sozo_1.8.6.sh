#!/usr/bin/env bash
# Install Sozo 1.8.6 manually (asdf-sozo uses old URL pattern and gets 404).
# Adds sozo to ~/.local/bin - ensure that is in your PATH.

set -e
SOZO_VERSION="1.8.6"
RELEASE_TAG="sozo%2Fv${SOZO_VERSION}"
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac
case "$OS" in
  linux) ;;
  darwin) OS="darwin" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

FILENAME="sozo_v${SOZO_VERSION}_${OS}_${ARCH}.tar.gz"
URL="https://github.com/dojoengine/dojo/releases/download/${RELEASE_TAG}/${FILENAME}"
INSTALL_DIR="${HOME}/.local/bin"
mkdir -p "$INSTALL_DIR"

echo "Downloading Sozo ${SOZO_VERSION}..."
curl -sSL -o /tmp/sozo.tar.gz "$URL"
echo "Extracting to ${INSTALL_DIR}..."
tar -xzf /tmp/sozo.tar.gz -C /tmp
mv /tmp/sozo "$INSTALL_DIR/sozo"
chmod +x "$INSTALL_DIR/sozo"
rm -f /tmp/sozo.tar.gz

echo "Done. Sozo ${SOZO_VERSION} installed to ${INSTALL_DIR}/sozo"
echo "Ensure ${INSTALL_DIR} is in your PATH (e.g. export PATH=\"${INSTALL_DIR}:\$PATH\")"
"$INSTALL_DIR/sozo" --version
