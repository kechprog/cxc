#!/usr/bin/env bash
set -euo pipefail

# ─── Load API key ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${BACKBOARD_API_KEY:-}" ]]; then
  echo "ERROR: BACKBOARD_API_KEY not set. Put it in reflectif/.env or export it."
  exit 1
fi

BASE="https://app.backboard.io/api"
PASS=0
FAIL=0
SKIP=0

# ─── Helpers ──────────────────────────────────────────────────────────────────
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }

check() {
  # check <label> <json_response> <jq_expression_that_should_be_truthy>
  local label="$1" body="$2" expr="$3"
  if echo "$body" | jq -e "$expr" > /dev/null 2>&1; then
    green "  ✓ $label"
    ((PASS++))
  else
    red "  ✗ $label"
    echo "    Response: $(echo "$body" | head -c 500)"
    ((FAIL++))
  fi
}

separator() {
  echo ""
  bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ─── Test 1: Create Assistant ─────────────────────────────────────────────────
separator
bold "Test 1: Create Assistant"

RESP=$(curl -s -X POST "$BASE/assistants" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reflectif Therapist Test",
    "llm_provider": "openai",
    "llm_model_name": "gpt-4o",
    "tools": []
  }')

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 300)"

ASSISTANT_ID=$(echo "$RESP" | jq -r '.id // .assistant_id // empty' 2>/dev/null || true)

if [[ -n "$ASSISTANT_ID" ]]; then
  green "  ✓ Got assistant_id = $ASSISTANT_ID"
  ((PASS++))
else
  red "  ✗ No assistant_id in response"
  ((FAIL++))
  echo "Cannot continue without assistant. Exiting."
  exit 1
fi

# ─── Test 2: Create Thread ───────────────────────────────────────────────────
separator
bold "Test 2: Create Thread"

RESP=$(curl -s -X POST "$BASE/assistants/$ASSISTANT_ID/threads" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 300)"

THREAD_ID=$(echo "$RESP" | jq -r '.id // .thread_id // empty' 2>/dev/null || true)

if [[ -n "$THREAD_ID" ]]; then
  green "  ✓ Got thread_id = $THREAD_ID"
  ((PASS++))
else
  red "  ✗ No thread_id in response"
  ((FAIL++))
  echo "Cannot continue without thread. Exiting."
  exit 1
fi

# ─── Test 3: Send Message (basic chat) ───────────────────────────────────────
separator
bold "Test 3: Send Message (basic chat, send_to_llm=true)"

RESP=$(curl -s -X POST "$BASE/threads/$THREAD_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -F "content=Hello, respond with just 'OK' to confirm you work." \
  -F "stream=false" \
  -F "memory=auto" \
  -F "send_to_llm=true")

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 500)"

check "Response has content" "$RESP" '.content // .message // .response | length > 0'

# ─── Test 4: Persistent Memory ──────────────────────────────────────────────
separator
bold "Test 4A: Seed memory (send_to_llm=false)"

RESP=$(curl -s -X POST "$BASE/threads/$THREAD_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -F "content=Core User File: The user's name is Alex. They work as a software engineer. They have anxiety around deadlines. Key relationship: partner named Jordan. Goal: improve emotional regulation." \
  -F "stream=false" \
  -F "memory=auto" \
  -F "send_to_llm=false")

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 500)"

# Extract memory operation id if present
MEM_OP_ID=$(echo "$RESP" | jq -r '.memory_operation_id // .mem_op_id // empty' 2>/dev/null || true)
if [[ -n "$MEM_OP_ID" ]]; then
  green "  ✓ Got memory_operation_id = $MEM_OP_ID"
else
  yellow "  ~ No memory_operation_id returned (may still work)"
fi

# Give memory time to index
echo "  Waiting 5s for memory indexing..."
sleep 5

separator
bold "Test 4B: Cross-thread memory recall"

# Create a NEW thread
RESP=$(curl -s -X POST "$BASE/assistants/$ASSISTANT_ID/threads" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

THREAD2_ID=$(echo "$RESP" | jq -r '.id // .thread_id // empty' 2>/dev/null || true)

if [[ -z "$THREAD2_ID" ]]; then
  red "  ✗ Could not create second thread"
  ((FAIL++))
else
  green "  ✓ Created second thread = $THREAD2_ID"

  RESP=$(curl -s -X POST "$BASE/threads/$THREAD2_ID/messages" \
    -H "X-API-Key: $BACKBOARD_API_KEY" \
    -F "content=What do you know about me? What is my partner's name?" \
    -F "stream=false" \
    -F "memory=auto" \
    -F "send_to_llm=true")

  echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

  # Check if response mentions seeded facts
  CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)
  CONTENT_LOWER=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')

  if echo "$CONTENT_LOWER" | grep -q "jordan"; then
    green "  ✓ Memory recall: mentions Jordan"
    ((PASS++))
  else
    red "  ✗ Memory recall: does NOT mention Jordan"
    ((FAIL++))
  fi

  if echo "$CONTENT_LOWER" | grep -q "alex"; then
    green "  ✓ Memory recall: mentions Alex"
    ((PASS++))
  else
    yellow "  ~ Memory recall: does NOT mention Alex (may be paraphrased)"
    ((SKIP++))
  fi
fi

# ─── Test 5A: Structured JSON via response_format (form field) ───────────────
separator
bold "Test 5A: Structured JSON — response_format as form field"

RESP=$(curl -s -X POST "$BASE/threads/$THREAD2_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -F "content=Based on what you know about me, fill in this user profile." \
  -F "stream=false" \
  -F "memory=auto" \
  -F "send_to_llm=true" \
  -F 'response_format={"type":"json_schema","json_schema":{"name":"core_user_file","strict":true,"schema":{"type":"object","properties":{"background":{"type":"string"},"relationships":{"type":"string"},"goals":{"type":"string"},"triggers":{"type":"string"}},"required":["background","relationships","goals","triggers"],"additionalProperties":false}}}')

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)
# Try to parse the content as JSON
if echo "$CONTENT" | jq -e '.background and .relationships and .goals and .triggers' > /dev/null 2>&1; then
  green "  ✓ 5A works! Got valid structured JSON from form field"
  RESULT_5A="yes"
  ((PASS++))
else
  yellow "  ~ 5A: response_format as form field did NOT produce structured JSON"
  RESULT_5A="no"
  ((SKIP++))
fi

# ─── Test 5B: Structured JSON via JSON body ──────────────────────────────────
separator
bold "Test 5B: Structured JSON — response_format via JSON body"

RESP=$(curl -s -X POST "$BASE/threads/$THREAD2_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Based on what you know about me, fill in this user profile.",
    "stream": false,
    "memory": "auto",
    "send_to_llm": true,
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "core_user_file",
        "strict": true,
        "schema": {
          "type": "object",
          "properties": {
            "background": {"type": "string"},
            "relationships": {"type": "string"},
            "goals": {"type": "string"},
            "triggers": {"type": "string"}
          },
          "required": ["background", "relationships", "goals", "triggers"],
          "additionalProperties": false
        }
      }
    }
  }')

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)
if echo "$CONTENT" | jq -e '.background and .relationships and .goals and .triggers' > /dev/null 2>&1; then
  green "  ✓ 5B works! Got valid structured JSON from JSON body"
  RESULT_5B="yes"
  ((PASS++))
else
  yellow "  ~ 5B: response_format via JSON body did NOT produce structured JSON"
  RESULT_5B="no"
  ((SKIP++))
fi

# ─── Test 5C: System prompt + prompt engineering fallback ────────────────────
separator
bold "Test 5C: Structured JSON — system prompt fallback"

# Create a new assistant with JSON-enforcing instructions
RESP=$(curl -s -X POST "$BASE/assistants" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reflectif JSON Test",
    "llm_provider": "openai",
    "llm_model_name": "gpt-4o",
    "instructions": "You ALWAYS respond with valid JSON only. No markdown, no explanation, no wrapping. Just the raw JSON object.",
    "tools": []
  }')

JSON_ASSISTANT_ID=$(echo "$RESP" | jq -r '.id // .assistant_id // empty' 2>/dev/null || true)

if [[ -z "$JSON_ASSISTANT_ID" ]]; then
  red "  ✗ Could not create JSON-mode assistant"
  ((FAIL++))
  RESULT_5C="no"
else
  green "  ✓ Created JSON-mode assistant = $JSON_ASSISTANT_ID"

  # Create thread for it
  RESP=$(curl -s -X POST "$BASE/assistants/$JSON_ASSISTANT_ID/threads" \
    -H "X-API-Key: $BACKBOARD_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{}')

  JSON_THREAD_ID=$(echo "$RESP" | jq -r '.id // .thread_id // empty' 2>/dev/null || true)

  if [[ -z "$JSON_THREAD_ID" ]]; then
    red "  ✗ Could not create thread for JSON assistant"
    ((FAIL++))
    RESULT_5C="no"
  else
    # Seed memory in this assistant too
    curl -s -X POST "$BASE/threads/$JSON_THREAD_ID/messages" \
      -H "X-API-Key: $BACKBOARD_API_KEY" \
      -F "content=Core User File: The user's name is Alex. They work as a software engineer. They have anxiety around deadlines. Key relationship: partner named Jordan. Goal: improve emotional regulation." \
      -F "stream=false" \
      -F "memory=auto" \
      -F "send_to_llm=false" > /dev/null

    sleep 3

    RESP=$(curl -s -X POST "$BASE/threads/$JSON_THREAD_ID/messages" \
      -H "X-API-Key: $BACKBOARD_API_KEY" \
      -F 'content=Return a JSON object matching this exact schema: {"background": "string describing job/lifestyle", "relationships": "string describing key people", "goals": "string describing improvement goals", "triggers": "string describing emotional triggers"}. Fill it based on what you know about me.' \
      -F "stream=false" \
      -F "memory=auto" \
      -F "send_to_llm=true")

    echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

    CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)

    # Try direct parse
    if echo "$CONTENT" | jq -e '.background and .relationships and .goals and .triggers' > /dev/null 2>&1; then
      green "  ✓ 5C works! System prompt produced valid JSON"
      RESULT_5C="yes"
      ((PASS++))
    else
      # Try stripping markdown code fences
      STRIPPED=$(echo "$CONTENT" | sed -n '/^```/,/^```$/p' | sed '1d;$d')
      if echo "$STRIPPED" | jq -e '.background and .relationships and .goals and .triggers' > /dev/null 2>&1; then
        green "  ✓ 5C works (with markdown stripping)! System prompt produced valid JSON"
        RESULT_5C="yes_with_strip"
        ((PASS++))
      else
        red "  ✗ 5C: System prompt did NOT produce parseable JSON"
        RESULT_5C="no"
        ((FAIL++))
      fi
    fi
  fi
fi

# ─── Test 5D: Does `instructions` persist as system prompt? ──────────────────
separator
bold "Test 5D: Verify instructions field acts as persistent system prompt"

if [[ -n "${JSON_THREAD_ID:-}" ]]; then
  RESP=$(curl -s -X POST "$BASE/threads/$JSON_THREAD_ID/messages" \
    -H "X-API-Key: $BACKBOARD_API_KEY" \
    -F "content=Tell me about emotional regulation." \
    -F "stream=false" \
    -F "memory=auto" \
    -F "send_to_llm=true")

  echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

  CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)

  # Check if it's JSON (instructions said "always respond with JSON")
  if echo "$CONTENT" | jq . > /dev/null 2>&1; then
    green "  ✓ 5D: instructions field persists — response is JSON"
    ((PASS++))
  else
    STRIPPED=$(echo "$CONTENT" | sed -n '/^```/,/^```$/p' | sed '1d;$d')
    if echo "$STRIPPED" | jq . > /dev/null 2>&1; then
      yellow "  ~ 5D: instructions persist but output has markdown wrapping"
      ((SKIP++))
    else
      red "  ✗ 5D: instructions do NOT persist or are ignored"
      ((FAIL++))
    fi
  fi
else
  yellow "  ~ 5D skipped (no JSON assistant thread)"
  ((SKIP++))
fi

# ─── Test 6: Streaming Response ─────────────────────────────────────────────
separator
bold "Test 6: Streaming (SSE)"

# Use timeout to cap streaming at 15s
STREAM_RESP=$(curl -s -N --max-time 15 -X POST "$BASE/threads/$THREAD2_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -F "content=Tell me a short motivational quote." \
  -F "stream=true" \
  -F "memory=auto" \
  -F "send_to_llm=true" 2>/dev/null || true)

echo "  First 500 chars: $(echo "$STREAM_RESP" | head -c 500)"

if echo "$STREAM_RESP" | grep -q "data:"; then
  green "  ✓ Streaming returns SSE data: lines"
  ((PASS++))

  if echo "$STREAM_RESP" | grep -q "content_streaming\|content_delta\|delta"; then
    green "  ✓ Contains content streaming events"
    ((PASS++))
  else
    yellow "  ~ No content_streaming event detected (may use different event name)"
    ((SKIP++))
  fi
else
  red "  ✗ No SSE data: lines in response"
  ((FAIL++))
fi

# ─── Test 7: Memory Update After Chat ───────────────────────────────────────
separator
bold "Test 7: Memory update after life event"

RESP=$(curl -s -X POST "$BASE/threads/$THREAD2_ID/messages" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -F "content=I need to tell you something. I just broke up with Jordan last week. It's been really hard." \
  -F "stream=false" \
  -F "memory=auto" \
  -F "send_to_llm=true")

echo "  Raw: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

# Check if response acknowledges the breakup
CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)
CONTENT_LOWER=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')

if echo "$CONTENT_LOWER" | grep -qE "sorry|hear|breakup|break.?up|jordan|difficult|tough|hard"; then
  green "  ✓ LLM acknowledged the life event"
  ((PASS++))
else
  yellow "  ~ LLM response didn't clearly acknowledge breakup"
  ((SKIP++))
fi

# Check memory operation if ID returned
MEM_OP_ID=$(echo "$RESP" | jq -r '.memory_operation_id // .mem_op_id // empty' 2>/dev/null || true)
if [[ -n "$MEM_OP_ID" ]]; then
  echo "  Checking memory operation $MEM_OP_ID..."
  sleep 2
  MEM_RESP=$(curl -s "$BASE/assistants/memories/operations/$MEM_OP_ID" \
    -H "X-API-Key: $BACKBOARD_API_KEY")
  echo "  Memory op: $(echo "$MEM_RESP" | jq -c . 2>/dev/null || echo "$MEM_RESP" | head -c 500)"
  green "  ✓ Memory operation endpoint responded"
  ((PASS++))
else
  yellow "  ~ No memory_operation_id in response (memory may update asynchronously)"
  ((SKIP++))
fi

# Now verify in a new thread that the breakup is remembered
echo "  Waiting 5s for memory update..."
sleep 5

RESP=$(curl -s -X POST "$BASE/assistants/$ASSISTANT_ID/threads" \
  -H "X-API-Key: $BACKBOARD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

THREAD3_ID=$(echo "$RESP" | jq -r '.id // .thread_id // empty' 2>/dev/null || true)

if [[ -n "$THREAD3_ID" ]]; then
  RESP=$(curl -s -X POST "$BASE/threads/$THREAD3_ID/messages" \
    -H "X-API-Key: $BACKBOARD_API_KEY" \
    -F "content=What's the latest you know about my relationship status?" \
    -F "stream=false" \
    -F "memory=auto" \
    -F "send_to_llm=true")

  echo "  Memory check: $(echo "$RESP" | jq -c . 2>/dev/null || echo "$RESP" | head -c 800)"

  CONTENT=$(echo "$RESP" | jq -r '.content // .message // .response // ""' 2>/dev/null || true)
  CONTENT_LOWER=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')

  if echo "$CONTENT_LOWER" | grep -qE "broke|breakup|break.?up|separated|split|ended"; then
    green "  ✓ Memory updated: new thread knows about breakup"
    ((PASS++))
  else
    red "  ✗ Memory NOT updated: new thread doesn't know about breakup"
    ((FAIL++))
  fi
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
separator
bold "RESULTS SUMMARY"
echo ""
green "  Passed: $PASS"
red "  Failed: $FAIL"
yellow "  Skipped/Unclear: $SKIP"
echo ""

bold "Structured Output Strategy:"
echo "  5A (form field response_format): $RESULT_5A"
echo "  5B (JSON body response_format):  $RESULT_5B"
echo "  5C (system prompt fallback):     ${RESULT_5C:-untested}"
echo ""

if [[ "$RESULT_5A" == "yes" ]]; then
  green "  → Recommended: Use response_format as form field"
elif [[ "$RESULT_5B" == "yes" ]]; then
  green "  → Recommended: Use response_format via JSON body"
elif [[ "${RESULT_5C:-}" == "yes" || "${RESULT_5C:-}" == "yes_with_strip" ]]; then
  yellow "  → Fallback: Use system prompt + prompt engineering"
  [[ "${RESULT_5C:-}" == "yes_with_strip" ]] && yellow "    (requires stripping markdown code fences)"
else
  red "  → No structured output method works — use Backboard for memory only, direct LLM for structured output"
fi

echo ""
bold "Cleanup: Created assistants $ASSISTANT_ID and ${JSON_ASSISTANT_ID:-none}"
echo "  You may want to delete these manually if the API supports it."
separator
