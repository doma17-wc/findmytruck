import type { MenuItem } from "./menu";

export type { MenuItem } from "./menu";

export interface PublicTruck {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisine_type: string[];
  price_range: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  menu_text: string | null;
  /** Structured menu (migration 0004). May be absent on rows read before the
   * migration has been applied — always run through normalizeMenuItems(). */
  menu_items?: MenuItem[] | null;
  menu_photo_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  website: string | null;
  languages: string[];
  food_type: string[];
  dietary_options: string[];
  payment_methods: string[];
  features: string[];
  is_active: boolean;
  is_claimed: boolean;
  short_code: string | null;
  created_at: string;
  updated_at: string;
  /** Unclaimed-profiles system (migration 0005). May be absent on rows read
   * before that migration -- always fall back to 'unclaimed'. */
  claim_status?: ClaimStatus | null;
  source_region?: string | null;
  source_website?: string | null;
  /** Approx. home-base coordinates for trucks with no schedule yet. */
  region_lat?: number | null;
  region_lng?: number | null;
  /** Boost system (migration 0007). "Boosted" = boosted && now < boost_expires_at,
   *  computed on read. May be absent on rows read before that migration. */
  boosted?: boolean | null;
  boost_expires_at?: string | null;
  boost_started_at?: string | null;
  boost_lat?: number | null;
  boost_lng?: number | null;
  /** Admin "pause" (migration 0008). A paused truck keeps all its data but is
   *  hidden from every public surface. May be absent on rows read before 0008. */
  paused?: boolean | null;
}

export type ClaimStatus = "unclaimed" | "pending" | "claimed";

export interface Truck extends PublicTruck {
  phone: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

export type ScheduleFrequency = "weekly" | "alternate" | "monthly_weeks";

export interface TruckSchedule {
  id: string;
  truck_id: string;
  day_of_week: number; // 0 = Mon .. 6 = Sun
  location_name: string;
  location_lat: number;
  location_lng: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;
  is_recurring: boolean;
  specific_date: string | null;
  notes: string | null;
  /** Frequency system (migration 0011). May be absent on rows read before that
   *  migration -- always fall back to "weekly" (every week, unchanged). */
  frequency?: ScheduleFrequency | null;
  /** Only set when frequency = "alternate": which ISO-week parity this stop runs on. */
  frequency_parity?: "even" | "odd" | null;
  /** Only set when frequency = "monthly_weeks": which occurrence(s) (1-4) of
   *  that weekday in the month this stop runs on. */
  frequency_weeks?: number[] | null;
}

/** Events system (migration 0011): one-off dated appearances, separate from
 *  the recurring weekly schedule. */
export interface FmtEvent {
  id: string;
  name: string;
  description: string | null;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
  start_time: string | null; // "HH:MM:SS"
  end_time: string | null;
  location_name: string;
  location_lat: number;
  location_lng: number;
  link: string | null;
  created_by_truck_id: string | null;
  created_at: string;
  /** Poster / flyer / venue photo (migration 0012). May be absent on rows read
   *  before that migration. */
  image_url?: string | null;
  /** Category (migration 0012). Falls back to "other" on pre-migration rows. */
  event_type?: EventType | null;
}

/** Event category (migration 0012). */
export type EventType =
  | "festival"
  | "market"
  | "catering"
  | "street_food"
  | "opening"
  | "other";

export interface EventTypeMeta {
  key: EventType;
  label: string;
  /** Tailwind classes for the badge chip (bg + text + border). */
  badge: string;
  /** Tailwind text-color class for the standalone icon. */
  icon: string;
  emoji: string;
}

export const EVENT_TYPE_META: Record<EventType, EventTypeMeta> = {
  festival: {
    key: "festival",
    label: "Festival",
    badge: "bg-brand-50 text-brand-700 border-brand-200",
    icon: "text-brand-600",
    emoji: "🎪",
  },
  market: {
    key: "market",
    label: "Market",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "text-emerald-600",
    emoji: "🧺",
  },
  catering: {
    key: "catering",
    label: "Private / Catering",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    icon: "text-violet-600",
    emoji: "🍽️",
  },
  street_food: {
    key: "street_food",
    label: "Street food gathering",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "text-amber-600",
    emoji: "🌮",
  },
  opening: {
    key: "opening",
    label: "Opening",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    icon: "text-sky-600",
    emoji: "🎉",
  },
  other: {
    key: "other",
    label: "Other",
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
    icon: "text-neutral-500",
    emoji: "📍",
  },
};

export const EVENT_TYPE_OPTIONS: EventType[] = [
  "festival",
  "market",
  "catering",
  "street_food",
  "opening",
  "other",
];

export function normalizeEventType(raw: unknown): EventType {
  return EVENT_TYPE_OPTIONS.includes(raw as EventType) ? (raw as EventType) : "other";
}

export type EventTruckStatus = "invited" | "confirmed" | "declined";

export interface EventTruckRef {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
}

/** An event with the CONFIRMED trucks attending it attached (many-to-many via
 *  `event_trucks`). `interestedCount` comes from `event_rsvp_counts`. */
export interface EventWithTrucks extends FmtEvent {
  trucks: EventTruckRef[];
  interestedCount: number;
}

export interface EventCollaborator {
  id: string;
  name: string;
  logo_url: string | null;
  status: EventTruckStatus;
}

/** One event as seen from a single truck's dashboard, with that truck's own
 *  link status attached so the panel can split hosting / attending / invited. */
export interface DashboardEvent extends EventWithTrucks {
  myStatus: EventTruckStatus;
  isHost: boolean;
  /** Every non-host truck linked to the event, any status. Only populated for
   *  events this truck HOSTS (so the host can manage its invite list). */
  collaborators: EventCollaborator[];
}

export interface TruckPhoto {
  id: string;
  truck_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
}

export interface Review {
  id: string;
  truck_id: string;
  user_id: string | null;
  author_name: string;
  rating: number;
  text: string | null;
  reply: string | null;
  created_at: string;
}

export interface QrRedirect {
  short_code: string;
  truck_id: string | null;
  destination_url: string;
  scan_count: number;
  created_at: string;
}

export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_LABELS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
