import { supabase } from "./supabase";
import type { EventTruckRef, EventWithTrucks, FmtEvent } from "./types";

/** Local-date string (YYYY-MM-DD), matching the `date`/`start_date`/`end_date`
 *  columns this module compares against. */
export function dateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function isEventOngoing(e: FmtEvent, now: Date = new Date()): boolean {
  const today = dateStr(now);
  return e.start_date <= today && today <= e.end_date;
}

export function isEventUpcoming(e: FmtEvent, now: Date = new Date()): boolean {
  return e.end_date >= dateStr(now);
}

export function sortByStartDate<T extends FmtEvent>(events: T[]): T[] {
  return [...events].sort((a, b) =>
    a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0
  );
}

/** Attach the trucks attending each event. Joined in two steps (event_trucks,
 *  then public_trucks) rather than a PostgREST embed -- the public-safe
 *  `public_trucks` view is what's actually readable by anon, not `trucks`. */
async function attachTrucks(events: FmtEvent[]): Promise<EventWithTrucks[]> {
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);
  const { data: links } = await supabase
    .from("event_trucks")
    .select("event_id, truck_id")
    .in("event_id", eventIds);

  const linkRows = (links ?? []) as { event_id: string; truck_id: string }[];
  const truckIds = Array.from(new Set(linkRows.map((l) => l.truck_id)));

  const trucksById = new Map<string, EventTruckRef>();
  if (truckIds.length > 0) {
    const { data: trucks } = await supabase
      .from("public_trucks")
      .select("id, slug, name")
      .in("id", truckIds);
    for (const t of (trucks ?? []) as EventTruckRef[]) trucksById.set(t.id, t);
  }

  const trucksByEvent = new Map<string, EventTruckRef[]>();
  for (const l of linkRows) {
    const truck = trucksById.get(l.truck_id);
    if (!truck) continue; // paused / inactive / deleted truck -- drop silently
    const list = trucksByEvent.get(l.event_id) ?? [];
    list.push(truck);
    trucksByEvent.set(l.event_id, list);
  }

  return events.map((e) => ({ ...e, trucks: trucksByEvent.get(e.id) ?? [] }));
}

/** All events linked to one truck (dashboard / public profile). */
export async function getEventsForTruck(
  truckId: string,
  opts: { upcomingOnly?: boolean } = {}
): Promise<EventWithTrucks[]> {
  const { data: links } = await supabase
    .from("event_trucks")
    .select("event_id")
    .eq("truck_id", truckId);
  const eventIds = ((links ?? []) as { event_id: string }[]).map((l) => l.event_id);
  if (eventIds.length === 0) return [];

  let query = supabase.from("events").select("*").in("id", eventIds);
  if (opts.upcomingOnly) query = query.gte("end_date", dateStr());
  const { data, error } = await query;
  if (error || !data) return [];
  return sortByStartDate(await attachTrucks(data as FmtEvent[]));
}

/** Every event across every truck that hasn't finished yet, for the public
 *  /events listing. Past events (end_date in the past) never come back. */
export async function getAllUpcomingEvents(): Promise<EventWithTrucks[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("end_date", dateStr())
    .order("start_date", { ascending: true });
  if (error || !data) return [];
  return sortByStartDate(await attachTrucks(data as FmtEvent[]));
}

/** Batched lookup for the map + detail sheet: every truck's upcoming (incl.
 *  ongoing-today) events, keyed by truck id. One pair of queries regardless of
 *  how many trucks are on the map. */
export async function getUpcomingEventsByTruck(
  truckIds: string[]
): Promise<Record<string, EventWithTrucks[]>> {
  if (truckIds.length === 0) return {};
  const { data: links } = await supabase
    .from("event_trucks")
    .select("event_id, truck_id")
    .in("truck_id", truckIds);
  const linkRows = (links ?? []) as { event_id: string; truck_id: string }[];
  const eventIds = Array.from(new Set(linkRows.map((l) => l.event_id)));
  if (eventIds.length === 0) return {};

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .gte("end_date", dateStr());
  if (!events || events.length === 0) return {};

  const withTrucks = await attachTrucks(events as FmtEvent[]);
  const byId = new Map(withTrucks.map((e) => [e.id, e]));

  const out: Record<string, EventWithTrucks[]> = {};
  for (const l of linkRows) {
    const e = byId.get(l.event_id);
    if (!e) continue; // filtered out as past
    (out[l.truck_id] ??= []).push(e);
  }
  for (const truckId of Object.keys(out)) out[truckId] = sortByStartDate(out[truckId]);
  return out;
}
