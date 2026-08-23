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
  truck_id: string | null;
  display_name: string | null;
  created_at: string;
}

/** Current signed-in user + their profile row, or null if signed out. */
export async function getCurrentUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as AppProfile | null };
}
