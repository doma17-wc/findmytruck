"use client";

import { useMemo, useState } from "react";
import type { EventWithTrucks } from "@/lib/types";
import { saveEventAction, setEventTrucksAction, deleteEventAction } from "@/app/admin/actions";
import { EVENT_TYPE_OPTIONS, EVENT_TYPE_META, type EventType } from "@/lib/types";
import { Card } from "./ui";
import LocationSearch from "./LocationSearch";
import TimePickerField from "@/components/shared/TimePickerField";
import EventImageDropzone from "@/components/shared/EventImageDropzone";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none";

export interface AdminEventTruckOption {
  id: string;
  name: string;
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

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

export default function AdminEventsTab({
  events,
  trucks,
}: {
  events: EventWithTrucks[];
  trucks: AdminEventTruckOption[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEvent>(emptyDraft);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truckFilter, setTruckFilter] = useState("");

  const sortedTrucks = useMemo(() => [...trucks].sort((a, b) => a.name.localeCompare(b.name)), [trucks]);
  const filteredTrucks = useMemo(
    () => sortedTrucks.filter((t) => t.name.toLowerCase().includes(truckFilter.toLowerCase())),
    [sortedTrucks, truckFilter]
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.start_date < b.start_date ? -1 : 1)),
    [events]
  );

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setShowForm(true);
  };

  const startEdit = (e: EventWithTrucks) => {
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
      truckIds: e.trucks.map((t) => t.id),
    });
    setError(null);
    setShowForm(true);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setShowForm(false);
  };

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
    if (res.error) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    if (editingId) {
      await setEventTrucksAction(editingId, draft.truckIds);
    }
    setSubmitting(false);
    cancel();
  };

  return (
    <div className="space-y-5">
      <Card className="p-0">
        {sortedEvents.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-neutral-400">No events yet</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {sortedEvents.map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{e.name}</span>
                  <span className="text-neutral-400"> · </span>
                  <span>{formatDateRange(e.start_date, e.end_date)}</span>
                  <div className="mt-0.5 text-xs text-neutral-500">{e.location_name}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {e.trucks.length === 0 ? (
                      <span className="text-xs text-neutral-400">No trucks linked</span>
                    ) : (
                      e.trucks.map((t) => (
                        <span
                          key={t.id}
                          className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600"
                        >
                          {t.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <button onClick={() => startEdit(e)} className="text-xs font-semibold text-accent-dark">
                    Edit
                  </button>
                  <button onClick={() => deleteEventAction(e.id)} className="text-xs font-semibold text-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!showForm ? (
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-accent-dark"
        >
          + New event
        </button>
      ) : (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-neutral-800">
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
                      end_date: d.end_date && d.end_date >= e.target.value ? d.end_date : e.target.value,
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
                setDraft((d) => ({ ...d, location_name: loc.name, location_lat: loc.lat, location_lng: loc.lng }))
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
      )}
    </div>
  );
}
