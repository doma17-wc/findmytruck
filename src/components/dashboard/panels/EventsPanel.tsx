"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import type { EventWithTrucks } from "@/lib/types";
import { saveOwnEventAction, deleteOwnEventAction, type EventInput } from "@/app/dashboard/actions";
import { Card, CardBody, dashInput, useToast, cn } from "../ui";
import LocationAutocomplete from "../LocationAutocomplete";
import TimePickerField from "@/components/shared/TimePickerField";

const emptyForm: EventInput = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
  startTime: "11:00",
  endTime: "18:00",
  location: "",
  lat: null,
  lng: null,
  link: "",
};

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

export default function EventsPanel({ events }: { events: EventWithTrucks[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const sorted = useMemo(
    () => [...events].sort((a, b) => (a.start_date < b.start_date ? -1 : 1)),
    [events]
  );

  const patch = (p: Partial<EventInput>) => setForm((f) => ({ ...f, ...p }));

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (e: EventWithTrucks) => {
    setEditingId(e.id);
    setForm({
      name: e.name,
      description: e.description ?? "",
      startDate: e.start_date,
      endDate: e.end_date,
      startTime: (e.start_time ?? "11:00").slice(0, 5),
      endTime: (e.end_time ?? "18:00").slice(0, 5),
      location: e.location_name,
      lat: e.location_lat,
      lng: e.location_lng,
      link: e.link ?? "",
    });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = () => {
    startTransition(async () => {
      const res = await saveOwnEventAction(editingId, form);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      toast(editingId ? "Event updated" : "Event added");
      cancel();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteOwnEventAction(id);
      if (res.error) toast(res.error, "error");
      else toast("Event removed");
    });
  };

  return (
    <div className="space-y-5">
      {!showForm && (
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-dark"
        >
          + New event
        </button>
      )}

      {showForm && (
        <Card>
          <CardBody className="space-y-3.5">
            <h3 className="font-display text-sm font-bold text-ink">
              {editingId ? "Edit event" : "New event"}
            </h3>

            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Event name (e.g. Zürich Street Food Festival)"
              className={dashInput}
            />

            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Description (optional)"
              rows={3}
              className={cn(dashInput, "resize-none")}
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">Start date</span>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    patch({
                      startDate: e.target.value,
                      endDate: form.endDate && form.endDate >= e.target.value ? form.endDate : e.target.value,
                    })
                  }
                  className={dashInput}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">End date</span>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  className={dashInput}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">Start time</span>
                <TimePickerField
                  value={form.startTime}
                  onChange={(startTime) => patch({ startTime })}
                  ariaLabel="Event start time"
                  triggerClassName={cn(dashInput, "text-left font-mono")}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">End time</span>
                <TimePickerField
                  value={form.endTime}
                  onChange={(endTime) => patch({ endTime })}
                  ariaLabel="Event end time"
                  triggerClassName={cn(dashInput, "text-left font-mono")}
                />
              </label>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-muted">Location</span>
              <LocationAutocomplete
                value={form.location}
                onChange={(location) => patch({ location, lat: null, lng: null })}
                onPick={({ name, lat, lng }) => patch({ location: name, lat, lng })}
                placeholder="Full address (e.g. Sechseläutenplatz 1, 8001 Zürich)"
                aria-label="Event location"
                className={dashInput}
              />
            </div>

            <input
              value={form.link}
              onChange={(e) => patch({ link: e.target.value })}
              placeholder="Link (optional — website, Facebook event, …)"
              className={dashInput}
            />

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Save changes" : "Add event"}
              </button>
              <button
                type="button"
                onClick={cancel}
                className="text-sm font-semibold text-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="p-0">
          {sorted.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted">
              No upcoming events yet. Add one above to show it on the map, your profile, and the
              public events page.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sorted.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{e.name}</p>
                    <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-accent-dark">
                      {formatDateRange(e.start_date, e.end_date)}
                      {e.start_time && ` · ${e.start_time.slice(0, 5)}–${(e.end_time ?? "").slice(0, 5)}`}
                    </p>
                    <p className="mt-1 flex items-start gap-1 text-[13px] text-ink-soft">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted" />
                      {e.location_name}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(e)}
                      aria-label="Edit event"
                      className="rounded-lg p-2 text-muted transition hover:bg-paper-deep hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(e.id)}
                      disabled={pending}
                      aria-label="Delete event"
                      className="rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
