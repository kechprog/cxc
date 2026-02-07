const BASE = "https://app.backboard.io/api";

function getApiKey(): string {
  const key = process.env.BACKBOARD_API_KEY;
  if (!key) throw new Error("BACKBOARD_API_KEY is not set");
  return key;
}

export async function createAssistant(
  name: string,
  instructions?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    llm_provider: "openai",
    llm_model_name: "gpt-4o",
    tools: [],
  };
  if (instructions) body.instructions = instructions;

  const res = await fetch(`${BASE}/assistants`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createAssistant failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const id = data.id ?? data.assistant_id;
  if (!id) throw new Error("No assistant ID in response");
  return id;
}

export async function createThread(assistantId: string): Promise<string> {
  const res = await fetch(`${BASE}/assistants/${assistantId}/threads`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createThread failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const id = data.id ?? data.thread_id;
  if (!id) throw new Error("No thread ID in response");
  return id;
}

export async function sendMessage(
  threadId: string,
  content: string,
  sendToLlm = true,
): Promise<{ content: string; messageId: string }> {
  const form = new FormData();
  form.append("content", content);
  form.append("stream", "false");
  form.append("memory", "auto");
  form.append("send_to_llm", String(sendToLlm));

  const res = await fetch(`${BASE}/threads/${threadId}/messages`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sendMessage failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    content: data.content ?? data.message ?? data.response ?? "",
    messageId: data.id ?? data.message_id ?? "",
  };
}
