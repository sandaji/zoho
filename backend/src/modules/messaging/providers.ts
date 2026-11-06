/**
 * Delivery providers. No extra npm packages: every provider is a plain HTTPS call.
 *
 * Credentials come from environment variables, never the database:
 *   EMAIL_PROVIDER=resend|log      RESEND_API_KEY, EMAIL_FROM ("Shop <orders@yourdomain.com>")
 *   SMS_PROVIDER=africastalking|log  AT_USERNAME, AT_API_KEY, AT_SENDER_ID (optional), AT_SANDBOX=true (optional)
 *   WHATSAPP_PROVIDER=meta|log     WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 *
 * A channel with no provider configured runs in "log" mode: the message is written to the
 * server log and marked SENT, so development works with no accounts. The messaging screen
 * shows which channels are live.
 */
export type Channel = "EMAIL" | "SMS" | "WHATSAPP";
export const CHANNELS: Channel[] = ["EMAIL", "SMS", "WHATSAPP"];

export interface SendInput {
  to: string;
  subject?: string | null;
  body: string;
}
export interface SendResult {
  provider: string;
  messageId?: string;
}

/** The provider said no and retrying will not help (bad number, bad credentials, rejected content). */
export class PermanentSendError extends Error {}

const env = (k: string) => (process.env[k] ?? "").trim();

export function providerStatus(): Record<Channel, { provider: string; live: boolean; note?: string }> {
  const email = env("EMAIL_PROVIDER").toLowerCase();
  const sms = env("SMS_PROVIDER").toLowerCase();
  const wa = env("WHATSAPP_PROVIDER").toLowerCase();
  const emailLive = email === "resend" && !!env("RESEND_API_KEY") && !!env("EMAIL_FROM");
  const smsLive = sms === "africastalking" && !!env("AT_USERNAME") && !!env("AT_API_KEY");
  const waLive = wa === "meta" && !!env("WHATSAPP_TOKEN") && !!env("WHATSAPP_PHONE_NUMBER_ID");
  return {
    EMAIL: emailLive
      ? { provider: "resend", live: true }
      : { provider: "log", live: false, note: "Set EMAIL_PROVIDER=resend, RESEND_API_KEY and EMAIL_FROM" },
    SMS: smsLive
      ? { provider: "africastalking", live: true, note: env("AT_SANDBOX") === "true" ? "Sandbox" : undefined }
      : { provider: "log", live: false, note: "Set SMS_PROVIDER=africastalking, AT_USERNAME and AT_API_KEY" },
    WHATSAPP: waLive
      ? { provider: "meta", live: true }
      : { provider: "log", live: false, note: "Set WHATSAPP_PROVIDER=meta, WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID" },
  };
}

/** Kenyan-friendly E.164 normalisation. Throws if it cannot be a phone number. */
export function normalizePhone(raw: string): string {
  let s = String(raw ?? "").trim().replace(/[\s\-().]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+")) {
    const d = s.slice(1);
    if (/^\d{9,15}$/.test(d)) return `+${d}`;
  } else if (/^0[17]\d{8}$/.test(s)) {
    return `+254${s.slice(1)}`;
  } else if (/^[17]\d{8}$/.test(s)) {
    return `+254${s}`;
  } else if (/^\d{11,15}$/.test(s)) {
    return `+${s}`;
  }
  throw new Error(`"${raw}" is not a valid phone number`);
}

export function normalizeEmail(raw: string): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error(`"${raw}" is not a valid email address`);
  return s;
}

async function http(url: string, init: RequestInit, what: string) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    // network error / timeout: worth retrying
    throw new Error(`${what}: ${e instanceof Error ? e.message : "request failed"}`);
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const msg = `${what}: HTTP ${res.status} ${(json?.message ?? json?.error?.message ?? text ?? "").toString().slice(0, 300)}`;
    if (res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) throw new PermanentSendError(msg);
    throw new Error(msg);
  }
  return json;
}

const htmlOf = (body: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</div>`;

export async function deliver(channel: Channel, input: SendInput): Promise<SendResult> {
  const st = providerStatus()[channel];

  if (!st.live) {
    // eslint-disable-next-line no-console
    console.log(`[messaging:${channel}:log] to=${input.to}${input.subject ? ` subject="${input.subject}"` : ""}\n${input.body}`);
    return { provider: "log" };
  }

  if (channel === "EMAIL") {
    const json = await http(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env("EMAIL_FROM"),
          to: [input.to],
          subject: input.subject || "(no subject)",
          text: input.body,
          html: htmlOf(input.body),
        }),
      },
      "Resend",
    );
    return { provider: "resend", messageId: json?.id };
  }

  if (channel === "SMS") {
    const sandbox = env("AT_SANDBOX") === "true";
    const form = new URLSearchParams({ username: env("AT_USERNAME"), to: input.to, message: input.body });
    if (env("AT_SENDER_ID")) form.set("from", env("AT_SENDER_ID"));
    const json = await http(
      `https://api.${sandbox ? "sandbox." : ""}africastalking.com/version1/messaging`,
      {
        method: "POST",
        headers: { apiKey: env("AT_API_KEY"), Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      },
      "Africa's Talking",
    );
    const r = json?.SMSMessageData?.Recipients?.[0];
    // statusCode 100-102 = processed / sent / queued
    if (!r || ![100, 101, 102].includes(Number(r.statusCode))) {
      throw new PermanentSendError(`Africa's Talking: ${r?.status ?? json?.SMSMessageData?.Message ?? "not accepted"}`);
    }
    return { provider: "africastalking", messageId: r.messageId };
  }

  // WhatsApp via Meta Cloud API. Free-form text is only delivered inside the 24h customer-service
  // window; outside it Meta requires an approved template (not covered here).
  const json = await http(
    `https://graph.facebook.com/v20.0/${env("WHATSAPP_PHONE_NUMBER_ID")}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: input.to.replace(/^\+/, ""),
        type: "text",
        text: { body: input.body },
      }),
    },
    "WhatsApp",
  );
  return { provider: "meta", messageId: json?.messages?.[0]?.id };
}
