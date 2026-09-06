/** Multi-truck per account (migration 0014): which of an owner's trucks the
 *  dashboard is currently managing. */

export const DASH_TRUCK_COOKIE = "fmt_dash_truck";

export interface OwnedTruckLite {
  id: string;
  name: string;
  slug: string;
  claim_status: string | null;
}

/**
 * Resolve the selected truck from (in priority order):
 *   1. an explicit `?truck=<id>` param (a shared / bookmarked link)
 *   2. the `fmt_dash_truck` cookie (last switched-to truck)
 *   3. `profiles.truck_id` (the owner's default truck)
 *   4. the first truck they own
 * — always constrained to a truck they actually own.
 */
export function resolveSelectedTruck(
  owned: OwnedTruckLite[],
  opts: { paramTruckId?: string | null; cookieTruckId?: string | null; defaultTruckId?: string | null }
): OwnedTruckLite | null {
  if (owned.length === 0) return null;
  const ownsId = (id: string | null | undefined) =>
    id ? owned.find((t) => t.id === id) ?? null : null;

  return (
    ownsId(opts.paramTruckId) ??
    ownsId(opts.cookieTruckId) ??
    ownsId(opts.defaultTruckId) ??
    owned[0]
  );
}
