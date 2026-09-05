import { supabase } from "./supabase";
import type {
  DashboardEvent,
  EventCollaborator,
  EventTruckRef,
  EventTruckStatus,
  EventWithTrucks,
  FmtEvent,
} from "./types";
import { normalizeEventType } from "./types";

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

function normalizeEvent(row: FmtEvent): FmtEvent {
  return { ...row, event_type: normalizeEventType(row.event_type) };
}

/** Attach the CONFIRMED trucks + the interested count to each event. Joined in
 *  steps (event_trucks -> public_trucks, then event_rsvp_counts) rather than a
 *  PostgREST embed -- the public-safe `public_trucks` view is what's actually
 *  readable by anon, not `trucks`. */
async function attachExtras(events: FmtEvent[]): Promise<EventWithTrucks[]> {
  if (events.length === 0) return [];
  const eventIds = events.map((e) => e.id);

  const [{ data: links }, { data: counts }] = await Promise.all([
    supabase.from("event_trucks").select("*").in("event_id", eventIds),
    supabase.from("event_rsvp_counts").select("event_id, interested_count").in("event_id", eventIds),
  ]);

  const linkRows = ((links ?? []) as {
    event_id: string;
    truck_id: string;
    status: EventTruckStatus | null;
  }[]).filter((l) => (l.status ?? "confirmed") === "confirmed");

  const truckIds = Array.from(new Set(linkRows.map((l) => l.truck_id)));
  const trucksById = new Map<string, EventTruckRef>();
  if (truckIds.length > 0) {
    const { data: trucks } = await supabase
      .from("public_trucks")
      .select("id, slug, name, logo_url")
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

  const countByEvent = new Map(
    ((counts ?? []) as { event_id: string; interested_count: number }[]).map((c) => [
      c.event_id,
      c.interested_count,
    ])
  );

  return events.map((e) => ({
    ...normalizeEvent(e),
    trucks: trucksByEvent.get(e.id) ?? [],
    interestedCount: countByEvent.get(e.id) ?? 0,
  }));
}

/** All CONFIRMED-attending or hosted events for one truck (public profile). */
export async function getEventsForTruck(
  truckId: string,
  opts: { upcomingOnly?: boolean } = {}
): Promise<EventWithTrucks[]> {
  const { data: links } = await supabase
    .from("event_trucks")
    .select("*")
    .eq("truck_id", truckId);
  const eventIds = ((links ?? []) as { event_id: string; status: EventTruckStatus | null }[])
    .filter((l) => (l.status ?? "confirmed") === "confirmed")
    .map((l) => l.event_id);
  if (eventIds.length === 0) return [];

  let query = supabase.from("events").select("*").in("id", eventIds);
  if (opts.upcomingOnly) query = query.gte("end_date", dateStr());
  const { data, error } = await query;
  if (error || !data) return [];
  return sortByStartDate(await attachExtras(data as FmtEvent[]));
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
  return sortByStartDate(await attachExtras(data as FmtEvent[]));
}

/** A single event by id, with confirmed trucks + interested count. */
export async function getEventById(id: string): Promise<EventWithTrucks | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const [withExtras] = await attachExtras([data as FmtEvent]);
  return withExtras ?? null;
}

/** Batched lookup for the map + detail sheet: every truck's upcoming (incl.
 *  ongoing-today) events, keyed by truck id. */
export async function getUpcomingEventsByTruck(
  truckIds: string[]
): Promise<Record<string, EventWithTrucks[]>> {
  if (truckIds.length === 0) return {};
  const { data: links } = await supabase
    .from("event_trucks")
    .select("*")
    .in("truck_id", truckIds);
  const linkRows = ((links ?? []) as {
    event_id: string;
    truck_id: string;
    status: EventTruckStatus | null;
  }[]).filter((l) => (l.status ?? "confirmed") === "confirmed");
  const eventIds = Array.from(new Set(linkRows.map((l) => l.event_id)));
  if (eventIds.length === 0) return {};

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("id", eventIds)
    .gte("end_date", dateStr());
  if (!events || events.length === 0) return {};

  const withExtras = await attachExtras(events as FmtEvent[]);
  const byId = new Map(withExtras.map((e) => [e.id, e]));

  const out: Record<string, EventWithTrucks[]> = {};
  for (const l of linkRows) {
    const e = byId.get(l.event_id);
    if (!e) continue; // filtered out as past
    (out[l.truck_id] ??= []).push(e);
  }
  for (const truckId of Object.keys(out)) out[truckId] = sortByStartDate(out[truckId]);
  return out;
}

/** Everything the dashboard Events panel needs for one truck: events it hosts,
 *  events it's confirmed at, and pending invitations — each carries the truck's
 *  own link status. Upcoming (not-yet-finished) events only. */
export async function getDashboardEvents(truckId: string): Promise<{
  hosting: DashboardEvent[];
  attending: DashboardEvent[];
  invitations: DashboardEvent[];
}> {
  const today = dateStr();

  const [{ data: links }, { data: hosted }] = await Promise.all([
    supabase.from("event_trucks").select("*").eq("truck_id", truckId),
    supabase.from("events").select("id").eq("created_by_truck_id", truckId).gte("end_date", today),
  ]);

  const linkRows = (links ?? []) as { event_id: string; status: EventTruckStatus | null }[];
  const statusByEvent = new Map(linkRows.map((l) => [l.event_id, l.status ?? "confirmed"]));
  const hostedIds = new Set(((hosted ?? []) as { id: string }[]).map((h) => h.id));

  const allIds = Array.from(new Set([...linkRows.map((l) => l.event_id), ...hostedIds]));
  if (allIds.length === 0) return { hosting: [], attending: [], invitations: [] };

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .in("id", allIds)
    .gte("end_date", today);
  if (!events || events.length === 0) return { hosting: [], attending: [], invitations: [] };

  const withExtras = await attachExtras(events as FmtEvent[]);

  // Full collaborator list (any status) for the events this truck hosts.
  const collaboratorsByEvent = new Map<string, EventCollaborator[]>();
  if (hostedIds.size > 0) {
    const { data: collabLinks } = await supabase
      .from("event_trucks")
      .select("*")
      .in("event_id", Array.from(hostedIds));
    const rows = ((collabLinks ?? []) as {
      event_id: string;
      truck_id: string;
      status: EventTruckStatus | null;
    }[]).filter((r) => r.truck_id !== truckId);
    const ids = Array.from(new Set(rows.map((r) => r.truck_id)));
    const nameById = new Map<string, { name: string; logo_url: string | null }>();
    if (ids.length > 0) {
      const { data: trucks } = await supabase
        .from("public_trucks")
        .select("id, name, logo_url")
        .in("id", ids);
      for (const t of (trucks ?? []) as { id: string; name: string; logo_url: string | null }[]) {
        nameById.set(t.id, { name: t.name, logo_url: t.logo_url });
      }
    }
    for (const r of rows) {
      const info = nameById.get(r.truck_id);
      if (!info) continue;
      const list = collaboratorsByEvent.get(r.event_id) ?? [];
      list.push({
        id: r.truck_id,
        name: info.name,
        logo_url: info.logo_url,
        status: r.status ?? "confirmed",
      });
      collaboratorsByEvent.set(r.event_id, list);
    }
  }

  const hosting: DashboardEvent[] = [];
  const attending: DashboardEvent[] = [];
  const invitations: DashboardEvent[] = [];

  for (const e of sortByStartDate(withExtras)) {
    const isHost = hostedIds.has(e.id);
    const myStatus: EventTruckStatus = isHost ? "confirmed" : statusByEvent.get(e.id) ?? "confirmed";
    const row: DashboardEvent = {
      ...e,
      isHost,
      myStatus,
      collaborators: isHost ? collaboratorsByEvent.get(e.id) ?? [] : [],
    };
    if (isHost) hosting.push(row);
    else if (myStatus === "invited") invitations.push(row);
    else if (myStatus === "confirmed") attending.push(row);
  }

  return { hosting, attending, invitations };
}
