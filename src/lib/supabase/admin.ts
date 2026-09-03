import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for the password-gated /admin panel ONLY.
 *
 * Most admin writes (trucks / schedules / photos / QR / claim status / pause)
 * work fine with the anon key thanks to the `anon write ...` RLS policies. But a
 * few operations touch data the anon key can never reach:
 *
 *   - listing every registered user (auth.users)
 *   - deleting a user account
 *   - linking / unlinking a truck-owner account by email
 *
 * Those require SUPABASE_SERVICE_ROLE_KEY. If it isn't set, this returns null
 * and the relevant admin UI shows a clear "add the key" notice instead of
 * silently doing nothing.
 */
export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hasServiceRole = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
