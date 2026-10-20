set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No .env found at $ENV_FILE" >&2
  exit 1
fi

while IFS= read -r line || [[ -n "$line" ]]; do

  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  [[ "$line" != *=* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  key="${key//[[:space:]]/}"
  [[ -z "$key" ]] && continue

  value="${value%$'\r'}"
  if [[ "$value" == \"*\" ]]; then value="${value%\"}"; value="${value#\"}"; fi
  export "$key=$value"
done < "$ENV_FILE"

target="${1:-}"
shift || true

case "$target" in
  booking)
    SCRIPT="$ROOT/services/booking-service/tests/k6/create-quote-pay.load.js"
    ;;
  alerts)
    SCRIPT="$ROOT/services/tracking-service/tests/k6/alert-detection.load.js"
    ;;
  gps)
    SCRIPT="$ROOT/services/tracking-service/tests/k6/gps-ingest.load.js"
    ;;
  *)
    echo "Usage: scripts/run-k6.sh {booking|alerts|gps} [extra k6 args...]" >&2
    exit 1
    ;;
esac

exec k6 run \
  -e AUTH0_DOMAIN="${AUTH0_DOMAIN:-}" \
  -e AUTH0_AUDIENCE="${AUTH0_AUDIENCE:-}" \
  -e AUTH0_CLIENT_ID="${AUTH0_CLIENT_ID:-}" \
  -e AUTH0_CLIENT_SECRET="${AUTH0_CLIENT_SECRET:-}" \
  -e SIM_USER_INDIVIDUAL_EMAIL="${SIM_USER_INDIVIDUAL_EMAIL:-}" \
  -e SIM_USER_INDIVIDUAL_PASSWORD="${SIM_USER_INDIVIDUAL_PASSWORD:-}" \
  -e SIM_USER_COMPANY_EMAIL="${SIM_USER_COMPANY_EMAIL:-}" \
  -e SIM_USER_COMPANY_PASSWORD="${SIM_USER_COMPANY_PASSWORD:-}" \
  -e SIM_USER_OPERATOR_EMAIL="${SIM_USER_OPERATOR_EMAIL:-}" \
  -e SIM_USER_OPERATOR_PASSWORD="${SIM_USER_OPERATOR_PASSWORD:-}" \
  -e GPS_DEVICE_SECRET="${GPS_DEVICE_SECRET:-}" \
  -e DEVICE_SECRET="${GPS_DEVICE_SECRET:-}" \
  "$@" \
  "$SCRIPT"
