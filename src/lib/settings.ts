import { supabase } from "./supabase";

/**
 * Platform settings the /admin panel toggles at runtime, stored one row per key
 * in `app_settings` (migration 0013) as `{ key, value: jsonb }`.
 *
 * Reads are best-effort: if the table doesn't exist yet (migration not applied)
 * or the row is missing, the caller's default is returned so nothing breaks.
 */

export type AppSettingKey = "reviews_require_login";

export async function getAppSetting<T>(key: AppSettingKey, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error || !data) return fallback;
  return (data.value as T) ?? fallback;
}

/** Convenience wrapper for the boolean toggles. */
export async function getBooleanSetting(
  key: AppSettingKey,
  fallback = false
): Promise<boolean> {
  return getAppSetting<boolean>(key, fallback);
}

export async function setAppSetting(
  key: AppSettingKey,
  value: unknown
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return error ? { error: error.message } : {};
}
