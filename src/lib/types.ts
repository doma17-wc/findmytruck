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
}

export interface Truck extends PublicTruck {
  phone: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

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
}

export interface TruckPhoto {
  id: string;
  truck_id: string;
  url: string;
  caption: string | null;
  sort_order: number;
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
