"use server";

import { headers } from "next/headers";
import { sendContactMessage } from "@/lib/email";

export interface ContactFormState {
  error?: string;
  ok?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACT_TYPES = [
  "I'm a customer",
  "I'm a food truck",
  "Partnership / other",
] as const;

// Light in-memory rate limit: max 4 submissions per IP per 10 minutes. Resets on
// cold start / per instance — enough to blunt casual abuse without a datastore.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 4;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_HITS;
}

export async function sendContactMessageAction(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Honeypot — real users never fill a hidden field. Pretend success.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { ok: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address so we can reply." };
  }
  if (!message) {
    return { error: "Please write a message." };
  }
  if (message.length > 5000) {
    return { error: "That message is a bit long — please keep it under 5000 characters." };
  }
  const cleanType = (CONTACT_TYPES as readonly string[]).includes(type) ? type : "";

  const ip =
    headers().get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers().get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return { error: "You've sent a few messages already — please try again in a little while." };
  }

  const { ok } = await sendContactMessage({
    name: name || null,
    email,
    type: cleanType || null,
    message,
  });

  if (!ok) {
    return {
      error: "Sorry, we couldn't send your message right now. Please email info@findmytruck.ch.",
    };
  }

  return { ok: true };
}
