export const ADMIN_COOKIE = "fmt_admin";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashAdminPassword(password: string): Promise<string> {
  return sha256Hex(password);
}

export async function isValidAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await hashAdminPassword(process.env.ADMIN_PASSWORD ?? "");
  return token === expected;
}
