/**
 * Structured menu shared helpers (safe to import from both client and server).
 *
 * Stored on `trucks.menu_items` as an ordered JSON array. The legacy
 * `menu_text` column is kept for backwards compatibility — see migration 0004.
 */
export interface MenuItem {
  name: string;
  price: number | null;
  description: string | null;
  category: string | null;
  /** Marked out of stock by the owner from the dashboard. Absent === false. */
  sold_out?: boolean;
}

export interface MenuGroup {
  category: string;
  items: MenuItem[];
}

/** Coerce arbitrary DB / form JSON into a clean MenuItem[] (drops empty rows). */
export function normalizeMenuItems(raw: unknown): MenuItem[] {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): MenuItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const o = entry as Record<string, unknown>;

      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) return null;

      let price: number | null = null;
      if (typeof o.price === "number" && Number.isFinite(o.price)) {
        price = o.price;
      } else if (typeof o.price === "string" && o.price.trim() !== "") {
        const parsed = Number(o.price.replace(",", "."));
        if (Number.isFinite(parsed)) price = parsed;
      }
      if (price !== null) price = Math.max(0, Math.round(price * 100) / 100);

      const description =
        typeof o.description === "string" && o.description.trim() ? o.description.trim() : null;
      const category =
        typeof o.category === "string" && o.category.trim() ? o.category.trim() : null;
      const sold_out = o.sold_out === true || o.sold_out === "true";

      return {
        name: name.slice(0, 120),
        price,
        description: description?.slice(0, 300) ?? null,
        category: category?.slice(0, 60) ?? null,
        sold_out,
      };
    })
    .filter((x): x is MenuItem => x !== null)
    .slice(0, 200);
}

/** Group items by category, preserving first-seen order, uncategorized first. */
export function groupMenu(items: MenuItem[]): MenuGroup[] {
  const groups: MenuGroup[] = [];
  for (const item of items) {
    const category = item.category ?? "";
    let group = groups.find((g) => g.category === category);
    if (!group) {
      group = { category, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  groups.sort((a, b) => (a.category === "" ? -1 : b.category === "" ? 1 : 0));
  return groups;
}

/** "CHF 12.–" / "CHF 9.50" / "" for a missing price. */
export function formatChf(price: number | null): string {
  if (price === null || price <= 0) return "";
  return Number.isInteger(price) ? `CHF ${price}.–` : `CHF ${price.toFixed(2)}`;
}
