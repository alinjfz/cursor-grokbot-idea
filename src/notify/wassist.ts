import { normalizePhone } from "@/src/notify/phone";

const BASE = "https://backend.wassist.app/api/v1";

type SendResult = { ok: true } | { ok: false; error: string };

export async function sendWhatsappText(toRaw: string | null | undefined, text: string): Promise<SendResult> {
  const key = process.env.WASSIST_API_KEY;
  if (!key) return { ok: false, error: "WhatsApp is not configured." };

  const to = normalizePhone(toRaw) ?? normalizePhone(process.env.WASSIST_TO_NUMBER);
  if (!to) {
    return { ok: false, error: "Add your WhatsApp number to send the confirmation." };
  }

  return deliver(key, to, text);
}

export async function sendOrderConfirmation(input: {
  to?: string | null;
  title: string;
  amountLabel: string;
  paidAt: string;
}): Promise<SendResult> {
  const text = [
    "Good Find confirmation",
    "",
    input.title,
    input.amountLabel,
    `Paid ${input.paidAt}`,
    "",
    "This message is your receipt. Nothing else will be charged from here.",
  ].join("\n");
  return sendWhatsappText(input.to, text);
}

async function deliver(key: string, to: string, text: string): Promise<SendResult> {

  try {
    const conversationId = await findOrOpenConversation(key, to);
    const sent = await postJson(key, `/conversations/${conversationId}/messages/`, {
      type: "text",
      text: { body: text },
    });
    if (!sent.ok && sent.status === 400) {
      const retry = await postJson(key, `/conversations/${conversationId}/messages/`, {
        type: "text",
        text: { message: text },
      });
      if (!retry.ok) return { ok: false, error: retry.error };
    } else if (!sent.ok) {
      return { ok: false, error: sent.error };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "WhatsApp could not be sent." };
  }
}

async function findOrOpenConversation(key: string, to: string): Promise<string> {
  const listed = await getJson(key, "/conversations/");
  const existing = conversationIdFor(listed, to);
  if (existing) return existing;

  const agent = await firstAgent(key);
  const created = await postJson(key, "/conversations/", {
    toNumber: to,
    ...(agent ? { agentId: agent.id } : { fromNumber: await firstFromNumber(key) }),
  });
  const id = created.ok ? idOf(created.body) : null;
  if (created.ok && id) return id;
  const reason = created.ok ? "Wassist did not return a conversation." : created.error;
  const link = agent?.connectUrl
    ? ` Open ${agent.connectUrl} on your phone, send that message, then press Send confirmation again.`
    : "";
  throw new Error(`${reason}.${link}`);
}

function conversationIdFor(payload: unknown, to: string): string | null {
  for (const item of asArray(payload)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const contact = row.contact;
    const phone = contact && typeof contact === "object"
      ? normalizePhone(String((contact as { phoneNumber?: unknown }).phoneNumber ?? ""))
      : normalizePhone(String(row.phoneNumber ?? row.toNumber ?? ""));
    if (phone === to && typeof row.id === "string") return row.id;
  }
  return null;
}

async function firstAgent(key: string): Promise<{ id: string; connectUrl?: string } | null> {
  const payload = await getJson(key, "/agents/");
  for (const item of asArray(payload)) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; connectUrl?: unknown };
    if (typeof row.id !== "string") continue;
    return { id: row.id, connectUrl: typeof row.connectUrl === "string" ? row.connectUrl : undefined };
  }
  return null;
}

async function firstFromNumber(key: string): Promise<string | undefined> {
  for (const path of ["/phone-numbers/", "/numbers/", "/whatsapp-accounts/"]) {
    try {
      const payload = await getJson(key, path);
      const found = numberOf(payload);
      if (found) return found;
    } catch {
      continue;
    }
  }
  return undefined;
}

function numberOf(payload: unknown): string | undefined {
  for (const item of asArray(payload)) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const raw = row.phoneNumber ?? row.number ?? row.displayPhoneNumber ?? row.whatsappNumber;
    const phone = normalizePhone(typeof raw === "string" ? raw : "");
    if (phone) return phone;
    const nested = numberOf(row.phoneNumbers ?? row.numbers);
    if (nested) return nested;
  }
  return undefined;
}

function idOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function asArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const row = payload as Record<string, unknown>;
  for (const key of ["results", "data", "items", "conversations", "agents", "phoneNumbers"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

async function getJson(key: string, path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorText(body, response.status));
  }
  return body;
}

async function postJson(key: string, path: string, payload: unknown): Promise<{ ok: true; body: unknown; status: number } | { ok: false; error: string; status: number }> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, status: response.status, error: errorText(body, response.status) };
  return { ok: true, status: response.status, body };
}

function errorText(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const row = body as Record<string, unknown>;
    for (const key of ["detail", "error", "message"]) {
      if (typeof row[key] === "string" && row[key].trim()) return row[key];
    }
    if (Array.isArray(row.non_field_errors)) {
      const text = row.non_field_errors.filter((item) => typeof item === "string").join(" ");
      if (text) return text;
    }
  }
  return `WhatsApp request failed (${status}).`;
}
