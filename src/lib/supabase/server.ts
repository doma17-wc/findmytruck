import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase client bound to the current request's session cookies. Use in
 * Server Components, Server Actions, and Route Handlers. */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render (not an Action/Route
            // Handler) -- middleware refreshes the session instead.
          }
        },
      },
    }
  );
}

export interface AppProfile {
  id: string;
  role: "customer" | "truck_owner";
  /** Informational since migration 0014: the owner's default / last-selected
   *  truck. Source of truth for ownership is `truck_owners` — see
   *  `ownedTruckIds` on the return of getCurrentUserProfile(). */
  truck_id: string | null;
  display_name: string | null;
  created_at: string;
  /** Follow-notification opt-in (migration 0013). Defaults to true. */
  notify_follow_live?: boolean | null;
  /** Opaque token for one-click e-mail unsubscribe (migration 0013). */
  notify_token?: string | null;
  /** Customer "pause account" switch (migration 0015). Defaults to false.
   *  While true the account is excluded from the follow/live fan-out. */
  deactivated?: boolean | null;
}

/** Current signed-in user + their profile row + every truck id they own
 *  (`truck_owners`, migration 0014), or null if signed out. */
export async function getCurrentUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: ownerLinks }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("truck_owners").select("truck_id").eq("user_id", user.id),
  ]);

  const ownedTruckIds = ((ownerLinks ?? []) as { truck_id: string }[]).map((r) => r.truck_id);

  return { user, profile: profile as AppProfile | null, ownedTruckIds };
}

/** The trucks a signed-in owner manages, newest link first, for the dashboard
 *  truck switcher. Empty for customers / signed-out. */
export async function getOwnedTrucks(): Promise<
  { id: string; name: string; slug: string; claim_status: string | null }[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: links } = await supabase
    .from("truck_owners")
    .select("truck_id, created_at")
    .eq("user_id", user.id);

  const ids = ((links ?? []) as { truck_id: string; created_at: string }[])
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map((l) => l.truck_id);
  if (ids.length === 0) return [];

  const { data: trucks } = await supabase
    .from("trucks")
    .select("id, name, slug, claim_status")
    .in("id", ids);

  const byId = new Map(
    ((trucks ?? []) as { id: string; name: string; slug: string; claim_status: string | null }[]).map(
      (t) => [t.id, t]
    )
  );
  // Preserve link order (oldest-owned first).
  return ids.map((id) => byId.get(id)).filter(Boolean) as {
    id: string;
    name: string;
    slug: string;
    claim_status: string | null;
  }[];
}
