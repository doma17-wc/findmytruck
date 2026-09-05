import "server-only";
import { Resend } from "resend";

/**
 * Central email helper. All mail goes out through Resend from the verified
 * findmytruck.ch domain. The API key lives only in server env — never import
 * this module from a Client Component.
 */

export const EMAIL_FROM = "FindMyTruck <info@findmytruck.ch>";
export const NOTIFY_TO = "info@findmytruck.ch";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

interface SendArgs {
  to?: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email. Never throws — on missing key or a Resend error it logs and
 * returns { ok: false } so callers can stay non-blocking.
 */
export async function sendEmail(args: SendArgs): Promise<{ ok: boolean }> {
  const resend = getClient();
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${args.subject}"`);
    return { ok: false };
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: args.to ?? NOTIFY_TO,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (error) {
      console.error("[email] Resend returned an error:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false };
  }
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#8C867E;font-size:13px;vertical-align:top;white-space:nowrap;">${esc(
      label
    )}</td>
    <td style="padding:6px 0;color:#191817;font-size:14px;">${value}</td>
  </tr>`;
}

/** ---------- Feature 1: truck joined (new registration OR claim) ---------- */

interface TruckJoinedInput {
  kind: "registration" | "claim";
  truckName: string;
  slug: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  phone?: string | null;
}

export async function notifyTruckJoined(input: TruckJoinedInput): Promise<void> {
  const isClaim = input.kind === "claim";
  const subject = isClaim
    ? `New claim: ${input.truckName}`
    : `🚚 New truck: ${input.truckName}`;

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://findmytruck.ch";
  const profileUrl = input.slug ? `${site}/trucks/${input.slug}` : null;
  const now = new Date().toISOString();

  const rows = [
    row("Truck", esc(input.truckName)),
    row("Type", isClaim ? "Claim of an existing profile" : "Brand-new registration"),
    row("Owner", input.ownerName ? esc(input.ownerName) : "—"),
    row(
      "Email",
      input.ownerEmail
        ? `<a href="mailto:${esc(input.ownerEmail)}" style="color:#FF6A00;">${esc(
            input.ownerEmail
          )}</a>`
        : "—"
    ),
    row("Phone", input.phone ? esc(input.phone) : "—"),
    row("Slug", input.slug ? esc(input.slug) : "—"),
    row(
      "Profile",
      profileUrl
        ? `<a href="${esc(profileUrl)}" style="color:#FF6A00;">${esc(profileUrl)}</a>`
        : "—"
    ),
    row("Timestamp", esc(now)),
  ].join("");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;">
    <h2 style="font-size:18px;color:#191817;margin:0 0 4px;">${
      isClaim ? "Profile claim submitted" : "New truck registered"
    }</h2>
    <p style="font-size:13px;color:#8C867E;margin:0 0 16px;">FindMyTruck notification</p>
    <table style="border-collapse:collapse;width:100%;">${rows}</table>
  </div>`;

  const text = [
    isClaim ? "Profile claim submitted" : "New truck registered",
    `Truck: ${input.truckName}`,
    `Type: ${isClaim ? "Claim of an existing profile" : "Brand-new registration"}`,
    `Owner: ${input.ownerName ?? "—"}`,
    `Email: ${input.ownerEmail ?? "—"}`,
    `Phone: ${input.phone ?? "—"}`,
    `Slug: ${input.slug ?? "—"}`,
    `Profile: ${profileUrl ?? "—"}`,
    `Timestamp: ${now}`,
  ].join("\n");

  await sendEmail({ subject, html, text });
}

/** ---------- Feature 2: contact form ---------- */

interface ContactInput {
  name?: string | null;
  email: string;
  type?: string | null;
  message: string;
}

export async function sendContactMessage(input: ContactInput): Promise<{ ok: boolean }> {
  const label = input.name?.trim() || input.email;
  const now = new Date().toISOString();

  const rows = [
    row("Name", input.name?.trim() ? esc(input.name.trim()) : "—"),
    row(
      "Email",
      `<a href="mailto:${esc(input.email)}" style="color:#FF6A00;">${esc(input.email)}</a>`
    ),
    row("Type", input.type?.trim() ? esc(input.type.trim()) : "—"),
    row("Timestamp", esc(now)),
  ].join("");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;">
    <h2 style="font-size:18px;color:#191817;margin:0 0 4px;">Contact form message</h2>
    <p style="font-size:13px;color:#8C867E;margin:0 0 16px;">Reply directly to this email to reach ${esc(
      label
    )}.</p>
    <table style="border-collapse:collapse;width:100%;">${rows}</table>
    <div style="margin-top:16px;padding:12px 14px;background:#FAF8F4;border:1px solid #E3DDD2;border-radius:8px;">
      <div style="font-size:12px;color:#8C867E;margin-bottom:6px;">Message</div>
      <div style="font-size:14px;color:#191817;white-space:pre-wrap;">${esc(input.message.trim())}</div>
    </div>
  </div>`;

  const text = [
    "Contact form message",
    `Name: ${input.name?.trim() || "—"}`,
    `Email: ${input.email}`,
    `Type: ${input.type?.trim() || "—"}`,
    `Timestamp: ${now}`,
    "",
    "Message:",
    input.message.trim(),
  ].join("\n");

  return sendEmail({
    subject: `📩 Contact form: ${label}`,
    html,
    text,
    replyTo: input.email,
  });
}

/** ---------- Feature 3: truck invited to collaborate on an event ---------- */

interface EventInvitationInput {
  to: string;
  invitedTruckName: string;
  hostTruckName: string;
  eventName: string;
  eventDate: string; // human-readable range
  eventLocation: string;
}

export async function notifyEventInvitation(input: EventInvitationInput): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://findmytruck.ch";
  const dashboardUrl = `${site}/dashboard`;

  const rows = [
    row("Event", esc(input.eventName)),
    row("Invited by", esc(input.hostTruckName)),
    row("When", esc(input.eventDate)),
    row("Where", esc(input.eventLocation)),
  ].join("");

  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;">
    <h2 style="font-size:18px;color:#191817;margin:0 0 4px;">You're invited to an event 🎉</h2>
    <p style="font-size:14px;color:#4A4642;margin:0 0 16px;">
      <strong>${esc(input.hostTruckName)}</strong> invited <strong>${esc(
        input.invitedTruckName
      )}</strong> to join their event on FindMyTruck.
    </p>
    <table style="border-collapse:collapse;width:100%;">${rows}</table>
    <p style="margin:20px 0 0;">
      <a href="${esc(dashboardUrl)}" style="display:inline-block;background:#FF6A00;color:#fff;
        font-size:14px;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:10px;">
        Review the invitation
      </a>
    </p>
    <p style="font-size:12px;color:#8C867E;margin:12px 0 0;">
      Open your dashboard → Events → Invitations to accept or decline.
    </p>
  </div>`;

  const text = [
    "You're invited to an event on FindMyTruck",
    `${input.hostTruckName} invited ${input.invitedTruckName} to join their event.`,
    "",
    `Event: ${input.eventName}`,
    `When: ${input.eventDate}`,
    `Where: ${input.eventLocation}`,
    "",
    `Accept or decline from your dashboard: ${dashboardUrl}`,
  ].join("\n");

  await sendEmail({
    to: input.to,
    subject: `🎉 ${input.hostTruckName} invited you to "${input.eventName}"`,
    html,
    text,
  });
}
