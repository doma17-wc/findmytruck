"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import type { AdminEvent, EventTruckStatus } from "@/lib/types";
import {
  saveEventAction,
  setEventTruckStatusAction,
  removeEventTruckAction,
  deleteEventAction,
} from "@/app/admin/actions";
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_META, type EventType } from "@/lib/types";
import { formatEventDateRange, formatEventTime } from "@/lib/eventFormat";
import EventTypeBadge from "@/components/shared/EventTypeBadge";
import { cn, Card, ActionButton } from "./ui";
import LocationSearch from "./LocationSearch";
import TimePickerField from "@/components/shared/TimePickerField";
import EventImageDropzone from "@/components/shared/EventImageDropzone";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none";

export interface AdminEventTruckOption {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface DraftEvent {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  link: string;
  image_url: string | null;
  event_type: EventType;
  truckIds: string[];
}

const emptyDraft: DraftEvent = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  start_time: "11:00",
  end_time: "18:00",
  location_name: "",
  location_lat: null,
  location_lng: null,
  link: "",
  image_url: null,
  event_type: "festival",
  truckIds: [],
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

type DateFilter = "upcoming" | "past" | "all";
type SortDir = "asc" | "desc";

export default function AdminEventsTab({
  events,
  trucks,
}: {
  events: AdminEvent[];
  trucks: AdminEventTruckOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEvent>(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truckFilter, setTruckFilter] = useState("");
  const [addTruckId, setAddTruckId] = useState("");

  const [dateFilter, setDateFilter] = useState<DateFilter>("upcoming");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");

  const today = useMemo(() => todayStr(), []);
  const truckById = useMemo(() => new Map(trucks.map((t) => [t.id, t])), [trucks]);
  const sortedTrucks = useMemo(() => [...trucks].sort((a, b) => a.name.localeCompare(b.name)), [trucks]);
  const filteredTrucks = useMemo(
    () => sortedTrucks.filter((t) => t.name.toLowerCase().includes(truckFilter.toLowerCase())),
    [sortedTrucks, truckFilter]
  );

  const visibleEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = events.filter((e) => {
      const past = e.end_date < today;
      if (dateFilter === "upcoming" && past) return false;
      if (dateFilter === "past" && !past) return false;
      if (needle) {
        const hay = `${e.name} ${e.location_name}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    filtered.sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
    if (sortDir === "desc") filtered.reverse();
    return filtered;
  }, [events, dateFilter, search, sortDir, today]);

  const editingEvent = editingId ? events.find((e) => e.id === editingId) ?? null : null;
  const linkedTruckIds = new Set((editingEvent?.truckLinks ?? []).map((l) => l.truck_id));
  const addableTrucks = sortedTrucks.filter((t) => !linkedTruckIds.has(t.id));

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (e: AdminEvent) => {
    setEditingId(e.id);
    setDraft({
      name: e.name,
      description: e.description ?? "",
      start_date: e.start_date,
      end_date: e.end_date,
      start_time: (e.start_time ?? "11:00").slice(0, 5),
      end_time: (e.end_time ?? "18:00").slice(0, 5),
      location_name: e.location_name,
      location_lat: e.location_lat,
      location_lng: e.location_lng,
      link: e.link ?? "",
      image_url: e.image_url ?? null,
      event_type: e.event_type ?? "festival",
      truckIds: [],
    });
    setAddTruckId("");
    setError(null);
    setShowForm(true);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setShowForm(false);
  };

  // The form renders as a modal overlay (see below) rather than inline in the
  // page flow -- with a long, filtered event grid, an inline form opened by a
  // card far down the page would render off-screen above the fold and look
  // like the Edit button did nothing. Esc closes it, matching the modal feel.
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingId(null);
        setDraft(emptyDraft);
        setError(null);
        setShowForm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  const toggleTruck = (id: string) =>
    setDraft((d) => ({
      ...d,
      truckIds: d.truckIds.includes(id) ? d.truckIds.filter((t) => t !== id) : [...d.truckIds, id],
    }));

  const handleSave = async () => {
    if (!draft.name.trim() || !draft.start_date || draft.location_lat === null) {
      setError("Name, start date, and a picked location are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", draft.name);
    fd.set("description", draft.description);
    fd.set("start_date", draft.start_date);
    fd.set("end_date", draft.end_date || draft.start_date);
    fd.set("start_time", draft.start_time);
    fd.set("end_time", draft.end_time);
    fd.set("location_name", draft.location_name);
    fd.set("location_lat", String(draft.location_lat));
    fd.set("location_lng", String(draft.location_lng));
    fd.set("link", draft.link);
    fd.set("image_url", draft.image_url ?? "");
    fd.set("event_type", draft.event_type);
    if (!editingId) fd.set("truck_ids", draft.truckIds.join(","));

    const res = await saveEventAction(editingId, fd);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    cancel();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-extrabold text-ink">
          Events <span className="text-muted">({visibleEvents.length})</span>
        </h1>
        {!showForm && (
          <button
            type="button"
            onClick={startNew}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
          >
            + New event
          </button>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name or city…"
        className="w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-[15px] outline-none focus:border-accent"
      />

      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: "upcoming", label: "Upcoming" },
          { key: "past", label: "Past" },
          { key: "all", label: "All" },
        ] as { key: DateFilter; label: string }[]).map((f) => (
          <button
            key={f.key}
            onClick={() => setDateFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold transition",
              dateFilter === f.key
                ? "border-ink bg-ink text-white"
                : "border-line bg-card text-ink-soft hover:border-accent/40"
            )}
          >
            {f.label}
          </button>
        ))}
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as SortDir)}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold text-ink-soft outline-none focus:border-accent"
        >
          <option value="asc">Sort: date ↑</option>
          <option value="desc">Sort: date ↓</option>
        </select>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
          onClick={cancel}
        >
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Card className="p-4">
              <h3 className="font-display text-sm font-bold text-ink">
                {editingId ? "Edit event" : "New event (e.g. a general festival with many trucks)"}
              </h3>
              <div className="mt-3 space-y-3">
                <EventImageDropzone
                  value={draft.image_url}
                  onChange={(image_url) => setDraft((d) => ({ ...d, image_url }))}
                />
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="Event name"
                  className={inputClass}
                />
                <select
                  value={draft.event_type}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, event_type: e.target.value as EventType }))
                  }
                  className={inputClass}
                >
                  {EVENT_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {EVENT_TYPE_META[t].emoji} {EVENT_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Start date</span>
                    <input
                      type="date"
                      value={draft.start_date}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          start_date: e.target.value,
                          end_date:
                            d.end_date && d.end_date >= e.target.value ? d.end_date : e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">End date</span>
                    <input
                      type="date"
                      value={draft.end_date}
                      min={draft.start_date || undefined}
                      onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
                      className={inputClass}
                    />
                  </label>
                </div>

                <LocationSearch
                  onSelect={(loc) =>
                    setDraft((d) => ({
                      ...d,
                      location_name: loc.name,
                      location_lat: loc.lat,
                      location_lng: loc.lng,
                    }))
                  }
                />
                {draft.location_lat !== null && (
                  <p className="text-xs text-neutral-500">Selected: {draft.location_name}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">Start time</span>
                    <TimePickerField
                      value={draft.start_time}
                      onChange={(start_time) => setDraft((d) => ({ ...d, start_time }))}
                      ariaLabel="Start time"
                      triggerClassName={`${inputClass} text-left`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-neutral-500">End time</span>
                    <TimePickerField
                      value={draft.end_time}
                      onChange={(end_time) => setDraft((d) => ({ ...d, end_time }))}
                      ariaLabel="End time"
                      triggerClassName={`${inputClass} text-left`}
                    />
                  </label>
                </div>

                <input
                  value={draft.link}
                  onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))}
                  placeholder="Link (optional)"
                  className={inputClass}
                />

                {!editingId ? (
                  <div>
                    <span className="mb-1 block text-xs font-medium text-neutral-500">
                      Trucks attending ({draft.truckIds.length} selected)
                    </span>
                    <input
                      value={truckFilter}
                      onChange={(e) => setTruckFilter(e.target.value)}
                      placeholder="Filter trucks…"
                      className={`${inputClass} mb-2`}
                    />
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-neutral-200">
                      {filteredTrucks.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 text-sm last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={draft.truckIds.includes(t.id)}
                            onChange={() => toggleTruck(t.id)}
                          />
                          {t.name}
                        </label>
                      ))}
                      {filteredTrucks.length === 0 && (
                        <div className="px-3 py-2 text-sm text-neutral-400">No trucks match</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="mb-1 block text-xs font-medium text-neutral-500">
                      Trucks attending — invite, confirm or remove
                    </span>
                    <div className="space-y-1.5 rounded-xl border border-neutral-200 p-2">
                      {(editingEvent?.truckLinks ?? []).length === 0 && (
                        <p className="px-2 py-1.5 text-sm text-neutral-400">No trucks linked yet</p>
                      )}
                      {(editingEvent?.truckLinks ?? []).map((link) => {
                        const truck = truckById.get(link.truck_id);
                        return (
                          <div
                            key={link.truck_id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium text-ink">
                              {truck?.name ?? "Unknown truck"}
                            </span>
                            <div className="flex flex-shrink-0 items-center gap-1.5">
                              <select
                                defaultValue={link.status}
                                onChange={(e) =>
                                  setEventTruckStatusAction(
                                    editingId,
                                    link.truck_id,
                                    e.target.value as EventTruckStatus
                                  )
                                }
                                className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs font-bold text-neutral-600 outline-none focus:border-accent"
                              >
                                <option value="invited">Invited</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="declined">Declined</option>
                              </select>
                              <ActionButton
                                onRun={() => removeEventTruckAction(editingId, link.truck_id)}
                                confirm={`Remove ${truck?.name ?? "this truck"} from the event?`}
                                className="bg-accent/10 text-accent-dark hover:bg-accent/20"
                              >
                                Remove
                              </ActionButton>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <select
                        value={addTruckId}
                        onChange={(e) => setAddTruckId(e.target.value)}
                        className={`${inputClass} flex-1`}
                      >
                        <option value="">Add a truck…</option>
                        {addableTrucks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!addTruckId}
                        onClick={() => {
                          const id = addTruckId;
                          setAddTruckId("");
                          void setEventTruckStatusAction(editingId, id, "confirmed");
                        }}
                        className="rounded-xl bg-live/10 px-3 py-2.5 text-xs font-bold text-live disabled:opacity-40"
                      >
                        Add confirmed
                      </button>
                      <button
                        type="button"
                        disabled={!addTruckId}
                        onClick={() => {
                          const id = addTruckId;
                          setAddTruckId("");
                          void setEventTruckStatusAction(editingId, id, "invited");
                        }}
                        className="rounded-xl bg-amber/10 px-3 py-2.5 text-xs font-bold text-amber disabled:opacity-40"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                )}

                {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={submitting}
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? "Saving…" : editingId ? "Save changes" : "Add event"}
                  </button>
                  <button type="button" onClick={cancel} className="text-sm font-semibold text-neutral-500">
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {visibleEvents.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {events.length === 0 ? "No events yet" : "No events match these filters"}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleEvents.map((e) => (
            <AdminEventCard
              key={e.id}
              event={e}
              truckById={truckById}
              past={e.end_date < today}
              onEdit={() => startEdit(e)}
              onDelete={() => deleteEventAction(e.id, e.created_by_truck_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminEventCard({
  event,
  truckById,
  past,
  onEdit,
  onDelete,
}: {
  event: AdminEvent;
  truckById: Map<string, AdminEventTruckOption>;
  past: boolean;
  onEdit: () => void;
  onDelete: () => Promise<{ error?: string } | void>;
}) {
  const meta = EVENT_TYPE_META[event.event_type ?? "other"];
  const time = formatEventTime(event.start_time, event.end_time);
  const confirmed = event.truckLinks.filter((l) => l.status === "confirmed");
  const invited = event.truckLinks.filter((l) => l.status === "invited");

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        {event.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.image_url} alt={event.name} className="h-full w-full object-cover" />
        ) : (
          <div className={`flex h-full w-full items-center justify-center text-5xl ${meta.badge.split(" ")[0]}`}>
            {meta.emoji}
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <EventTypeBadge type={event.event_type} size="md" className="bg-white/95 backdrop-blur-sm" />
          {past && (
            <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              Past
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatEventDateRange(event.start_date, event.end_date)}
            {time && ` · ${time}`}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-bold leading-snug text-ink">{event.name}</h3>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted" />
          <span className="line-clamp-1">{event.location_name}</span>
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {confirmed.length === 0 && invited.length === 0 ? (
            <span className="text-xs text-muted">No trucks linked</span>
          ) : (
            <>
              {confirmed.map((l) => (
                <span
                  key={l.truck_id}
                  className="rounded-full bg-live/10 px-2 py-0.5 text-[11px] font-semibold text-live"
                >
                  {truckById.get(l.truck_id)?.name ?? "Unknown truck"}
                </span>
              ))}
              {invited.map((l) => (
                <span
                  key={l.truck_id}
                  className="rounded-full border border-dashed border-amber/50 bg-amber/10 px-2 py-0.5 text-[11px] font-semibold text-amber"
                >
                  {truckById.get(l.truck_id)?.name ?? "Unknown truck"} · invited
                </span>
              ))}
            </>
          )}
        </div>

        {event.interestedCount > 0 && (
          <p className="mt-1.5 text-xs text-muted">{event.interestedCount} interested</p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:border-accent/40"
          >
            Edit
          </button>
          <ActionButton
            onRun={onDelete}
            confirm={`Delete "${event.name}" permanently? This cannot be undone.`}
            className="ml-auto bg-accent/10 text-accent-dark hover:bg-accent/20"
          >
            Delete
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}
