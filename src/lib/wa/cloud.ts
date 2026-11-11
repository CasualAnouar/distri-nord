import { createHmac, timingSafeEqual } from "node:crypto";
import { BUTTON_ACTIONS, TEMPLATES, creationPayload, param, templateLangs, type TemplateKey, type TemplateLang } from "./templates";

// Thin client for the WhatsApp Cloud API (Meta Graph API). Server only.
// Env: WHATSAPP_TOKEN (system user token), WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID,
// WHATSAPP_APP_SECRET (webhook signature), WHATSAPP_VERIFY_TOKEN (webhook setup),
// WHATSAPP_API_VERSION (optional).

// Values pasted into a dashboard often carry stray spaces, line breaks or quotes.
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();

const env = () => ({
  token: clean(process.env.WHATSAPP_TOKEN),
  phoneId: clean(process.env.WHATSAPP_PHONE_NUMBER_ID),
  wabaId: clean(process.env.WHATSAPP_WABA_ID),
  appSecret: clean(process.env.WHATSAPP_APP_SECRET),
  verifyToken: clean(process.env.WHATSAPP_VERIFY_TOKEN),
  version: process.env.WHATSAPP_API_VERSION || "v25.0",
  base: process.env.WHATSAPP_GRAPH_URL || "https://graph.facebook.com", // overridable for local tests
});

export function envStatus() {
  const e = env();
  return { token: Boolean(e.token), phoneId: Boolean(e.phoneId), wabaId: Boolean(e.wabaId), appSecret: Boolean(e.appSecret), verifyToken: Boolean(e.verifyToken) };
}

export const cloudConfigured = () => {
  const e = env();
  return Boolean(e.token && e.phoneId);
};

export class WaError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
  }
}

async function graph<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const e = env();
  const res = await fetch(`${e.base}/${e.version}/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${e.token}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_user_msg?: string } } & T;
  if (!res.ok || json.error) {
    const err = json.error;
    throw new WaError(err?.error_user_msg || err?.message || `HTTP ${res.status}`, err?.code);
  }
  return json;
}

type SendResult = { messages?: { id: string }[] };

async function send(to: string, message: Record<string, unknown>): Promise<string> {
  const r = await graph<SendResult>(`${env().phoneId}/messages`, { method: "POST", body: { messaging_product: "whatsapp", recipient_type: "individual", to, ...message } });
  return r.messages?.[0]?.id ?? "";
}

export function sendTemplate(to: string, key: TemplateKey, lang: TemplateLang, params: string[], orderId?: string) {
  const t = TEMPLATES[key];
  const components: Record<string, unknown>[] = [{ type: "body", parameters: params.map((p) => ({ type: "text", text: param(p) })) }];
  BUTTON_ACTIONS[key].forEach((action, index) => {
    components.push({ type: "button", sub_type: "quick_reply", index: String(index), parameters: [{ type: "payload", payload: `${action}:${orderId ?? ""}` }] });
  });
  return send(to, { type: "template", template: { name: t.name, language: { code: lang }, components } });
}

export const sendHelloWorld = (to: string) => send(to, { type: "template", template: { name: "hello_world", language: { code: "en_US" } } });

export const sendText = (to: string, body: string) => send(to, { type: "text", text: { body, preview_url: true } });

// Up to 3 reply buttons (titles 20 chars max). Only inside the 24 h window.
export const sendButtons = (to: string, body: string, buttons: { id: string; title: string }[]) =>
  send(to, {
    type: "interactive",
    interactive: { type: "button", body: { text: body }, action: { buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) } },
  });

// Shows WhatsApp's native "Send location" button. Only inside the 24 h window.
export const sendLocationRequest = (to: string, body: string) =>
  send(to, { type: "interactive", interactive: { type: "location_request_message", body: { text: body }, action: { name: "send_location" } } });

export const sendLocation = (to: string, lat: number, lng: number, name: string) => send(to, { type: "location", location: { latitude: lat, longitude: lng, name } });

export const markRead = (messageId: string) => graph(`${env().phoneId}/messages`, { method: "POST", body: { messaging_product: "whatsapp", status: "read", message_id: messageId } }).catch(() => undefined);

// Meta signs each webhook call with the app secret (X-Hub-Signature-256: sha256=<hex>).
export function validSignature(raw: string, header: string | null) {
  const secret = env().appSecret;
  if (!secret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const verifyToken = () => env().verifyToken;

// ---- Account checks and template management (dashboard) ----

export async function phoneInfo() {
  return graph<{ display_phone_number?: string; verified_name?: string; quality_rating?: string; code_verification_status?: string }>(
    `${env().phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
  );
}

type RemoteTemplate = { name: string; language: string; status: string; rejected_reason?: string };

export async function listTemplates(): Promise<RemoteTemplate[]> {
  const names = new Set(Object.values(TEMPLATES).map((t) => t.name));
  const r = await graph<{ data: RemoteTemplate[] }>(`${env().wabaId}/message_templates?fields=name,language,status,rejected_reason&limit=200`);
  return r.data.filter((t) => names.has(t.name));
}

export async function createMissingTemplates() {
  const existing = await listTemplates();
  const results: { name: string; language: string; result: string }[] = [];
  for (const key of Object.keys(TEMPLATES) as TemplateKey[]) {
    for (const lang of templateLangs(key)) {
      const name = TEMPLATES[key].name;
      if (existing.some((t) => t.name === name && t.language === lang)) continue;
      try {
        const r = await graph<{ status?: string }>(`${env().wabaId}/message_templates`, { method: "POST", body: creationPayload(key, lang) });
        results.push({ name, language: lang, result: r.status ?? "PENDING" });
      } catch (e) {
        results.push({ name, language: lang, result: `Erreur : ${(e as Error).message}` });
      }
    }
  }
  return results;
}
