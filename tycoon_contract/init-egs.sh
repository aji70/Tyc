#!/usr/bin/env bash
# Register EGS adapter in the Dojo world and print set_authorized_caller command.
# Run from tycoon_contract/ with adapter address from deploy:
#   ./init-egs.sh 0x<ADAPTER_ADDRESS>
set -e
ADAPTER="${1:?Usage: ./init-egs.sh <ADAPTER_ADDRESS>}"

ENV_FILE=".env.sepolia"
if [ -f "$ENV_FILE" ]; then
  echo "Loading $ENV_FILE..."
  export $(grep -v '^#' "$ENV_FILE" | sed 's/^export //' | xargs)
fi

echo "Running init_egs_config (no-op if already inited)..."
sozo -P sepolia execute tycoon-game init_egs_config

echo "Registering adapter..."
sozo -P sepolia execute tycoon-game set_egs_adapter --calldata "$ADAPTER"

echo ""
echo "Done. Now call set_authorized_caller on the adapter with your tycoon-game address."
echo "Get it from manifest_sepolia.json (world or contracts). Example:"
echo "  starkli invoke $ADAPTER set_authorized_caller <TYCOON_GAME_ADDRESS> \\"
echo "    --account <ACCOUNT> --rpc \${STARKNET_RPC_URL} --private-key \${DOJO_PRIVATE_KEY}"
