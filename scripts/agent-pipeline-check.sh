#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
CRON_SECRET="${CRON_SECRET:-}"
AGENT_ID="${AGENT_ID:-agent-ai-creator-001}"
INIT_PAYLOAD='{"persona":{"name":"Ada","domain":"AI Security"}}'

function show_header() {
  echo
  echo "============================================================"
  echo " $1"
  echo "============================================================"
}

show_header "1) POST /api/agent/init"
curl -sS -X POST "${BASE_URL}/api/agent/init" \
  -H 'Content-Type: application/json' \
  -d "${INIT_PAYLOAD}" | jq .

show_header "2) FEED before cron"
PRE_FEED_JSON=$(curl -sS -X GET "${BASE_URL}/api/agent/feed?agentId=${AGENT_ID}" \
  -H 'Content-Type: application/json')
echo "PRE-CRON FEED RESPONSE:" | jq -R .
echo "$PRE_FEED_JSON" | jq .
PRE_COUNT=$(echo "$PRE_FEED_JSON" | jq '.posts | length')
PRE_NEWEST=$(echo "$PRE_FEED_JSON" | jq -r '.posts | map(.createdAt) | max')
echo "pre-cron count=${PRE_COUNT}, newest=${PRE_NEWEST}"

show_header "3) GET /api/cron/run"
CRON_HEADERS=()
if [ -n "${CRON_SECRET}" ]; then
  CRON_HEADERS+=( -H "Authorization: Bearer ${CRON_SECRET}" )
fi
curl -sS -X GET "${BASE_URL}/api/cron/run" \
  -H 'Content-Type: application/json' "${CRON_HEADERS[@]}" | jq .

show_header "4) FEED after cron"
POST_FEED_JSON=$(curl -sS -X GET "${BASE_URL}/api/agent/feed?agentId=${AGENT_ID}" \
  -H 'Content-Type: application/json')
echo "POST-CRON FEED RESPONSE:" | jq -R .
echo "$POST_FEED_JSON" | jq .
POST_COUNT=$(echo "$POST_FEED_JSON" | jq '.posts | length')
POST_NEWEST=$(echo "$POST_FEED_JSON" | jq -r '.posts | map(.createdAt) | max')
echo "post-cron count=${POST_COUNT}, newest=${POST_NEWEST}"

show_header "5) VERIFY feed schema with jq"
echo "$POST_FEED_JSON" | jq -e '
  type == "object" and
  has("posts") and
  (.posts | type == "array") and
  (.posts | length > 0) and
  (.posts | all(
    type == "object" and
    has("id") and (.id | type == "string") and
    has("createdAt") and (.createdAt | type == "string") and
    try (.createdAt | fromdateiso8601) | . != null and
    has("text") and (.text | type == "string") and
    has("rationale") and (.rationale | type == "string") and
    has("sources") and (.sources | type == "array") and
    (.sources | all(type == "string"))
  ))
'

show_header "6) AUTONOMY CHECK"
echo "pre-cron count=${PRE_COUNT}, post-cron count=${POST_COUNT}"
echo "pre-cron newest=${PRE_NEWEST}, post-cron newest=${POST_NEWEST}"
if [ "$POST_COUNT" -ge "$PRE_COUNT" ]; then
  echo "count check passed"
else
  echo "count check failed: post cron count is smaller"
  exit 1
fi
if [ "$POST_NEWEST" != "null" ] && [ "$POST_NEWEST" != "" ]; then
  echo "timestamp check passed"
else
  echo "timestamp check failed: no newest timestamp after cron"
  exit 1
fi

echo
 echo "All validation steps completed."
