"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, MapPin, Pencil, Search, Trash2, X } from "lucide-react";
import type { DashboardEvent } from "@/lib/types";
import { EVENT_TYPE_META, EVENT_TYPE_OPTIONS } from "@/lib/types";
import {
  saveOwnEventAction,
  deleteOwnEventAction,
  respondToEventInviteAction,
  searchTrucksAction,
  type EventInput,
  type TruckSearchResult,
} from "@/app/dashboard/actions";
import { Card, CardBody, dashInput, useToast, cn } from "../ui";
import LocationAutocomplete from "../LocationAutocomplete";
import TimePickerField from "@/components/shared/TimePickerField";
import EventImageDropzone from "@/components/shared/EventImageDropzone";
import EventTypeBadge from "@/components/shared/EventTypeBadge";

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
  imageUrl: null,
  eventType: "festival",
  invitedTruckIds: [],
};

function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = new Date(`${start}T00:00:00`).toLocaleDateString("en", opts);
  if (start === end) return s;
  const e = new Date(`${end}T00:00:00`).toLocaleDateString("en", opts);
  return `${s} – ${e}`;
}

/* ------------------------- invite-a-truck picker ------------------------- */

function InvitePicker({
  selected,
  knownNames,
  onChange,
}: {
  selected: string[];
  knownNames: Record<string, { name: string; logo_url: string | null }>;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TruckSearchResult[]>([]);
  const [searching, startSearch] = useTransition();

  const runSearch = (q: string) => {
    setQuery(q);
    startSearch(async () => {
      setResults(await searchTrucksAction(q));
    });
  };

  const add = (t: TruckSearchResult) => {
    knownNames[t.id] = { name: t.name, logo_url: t.logo_url };
    if (!selected.includes(t.id)) onChange([...selected, t.id]);
    setQuery("");
    setResults([]);
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-semibold text-muted">
        Invite other trucks {selected.length > 0 && `(${selected.length})`}
      </span>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-2 pr-1 text-xs font-semibold text-brand-700"
            >
              {knownNames[id]?.name ?? "Truck"}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== id))}
                aria-label="Remove invite"
                className="rounded-full p-0.5 hover:bg-brand-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => runSearch(e.target.value)}
          onFocus={() => results.length === 0 && runSearch("")}
          placeholder="Search trucks by name…"
          className={cn(dashInput, "pl-9")}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-line">
          {results.map((t) => {
            const isOn = selected.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => (isOn ? onChange(selected.filter((x) => x !== t.id)) : add(t))}
                className="flex w-full items-center gap-2.5 border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-paper-deep"
              >
                {t.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logo_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                    {t.name.charAt(0)}
                  </span>
                )}
                <span className="flex-1 truncate text-ink">{t.name}</span>
                {isOn && <Check className="h-4 w-4 text-brand" />}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted">
        Invited trucks confirm from their own dashboard before they show as attending.
      </p>
    </div>
  );
}

/* --------------------------------- panel --------------------------------- */

export default function EventsPanel({
  truckName,
  hosting,
  attending,
  invitations,
}: {
  truckName: string;
  hosting: DashboardEvent[];
  attending: DashboardEvent[];
  invitations: DashboardEvent[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  // name/logo cache for the invite chips, seeded from the event being edited.
  const [knownNames, setKnownNames] = useState<
    Record<string, { name: string; logo_url: string | null }>
  >({});

  const patch = (p: Partial<EventInput>) => setForm((f) => ({ ...f, ...p }));

  const startNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setKnownNames({});
    setShowForm(true);
  };

  const startEdit = (e: DashboardEvent) => {
    setEditingId(e.id);
    const names: Record<string, { name: string; logo_url: string | null }> = {};
    for (const c of e.collaborators) names[c.id] = { name: c.name, logo_url: c.logo_url };
    setKnownNames(names);
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
      imageUrl: e.image_url ?? null,
      eventType: e.event_type ?? "festival",
      invitedTruckIds: e.collaborators.filter((c) => c.status !== "declined").map((c) => c.id),
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

  const respond = (id: string, response: "confirmed" | "declined") => {
    startTransition(async () => {
      const res = await respondToEventInviteAction(id, response);
      if (res.error) toast(res.error, "error");
      else toast(response === "confirmed" ? "Invitation accepted" : "Invitation declined");
    });
  };

  return (
    <div className="space-y-6">
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

            <EventImageDropzone
              value={form.imageUrl}
              onChange={(imageUrl) => patch({ imageUrl })}
            />

            <input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Event name (e.g. Zürich Street Food Festival)"
              className={dashInput}
            />

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-muted">Type</span>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPE_OPTIONS.map((t) => {
                  const meta = EVENT_TYPE_META[t];
                  const active = form.eventType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ eventType: t })}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                        active
                          ? meta.badge
                          : "border-line bg-card text-muted hover:text-ink"
                      )}
                    >
                      <span>{meta.emoji}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                      endDate:
                        form.endDate && form.endDate >= e.target.value ? form.endDate : e.target.value,
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

            <InvitePicker
              selected={form.invitedTruckIds}
              knownNames={knownNames}
              onChange={(invitedTruckIds) => {
                setKnownNames({ ...knownNames });
                patch({ invitedTruckIds });
              }}
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

      {/* ---- Invitations ---- */}
      {invitations.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-sm font-bold text-ink">
            Invitations{" "}
            <span className="ml-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent-dark">
              {invitations.length}
            </span>
          </h3>
          <div className="space-y-2.5">
            {invitations.map((e) => (
              <Card key={e.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <EventTypeBadge type={e.event_type} />
                      <p className="font-semibold text-ink">{e.name}</p>
                    </div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent-dark">
                      {formatDateRange(e.start_date, e.end_date)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-soft">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
                      {e.location_name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respond(e.id, "confirmed")}
                      disabled={pending}
                      className="rounded-lg bg-live/10 px-3 py-2 text-xs font-bold text-live transition hover:bg-live/20 disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(e.id, "declined")}
                      disabled={pending}
                      className="rounded-lg bg-paper-deep px-3 py-2 text-xs font-bold text-muted transition hover:text-ink disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ---- Events I host ---- */}
      <section>
        <h3 className="mb-2 font-display text-sm font-bold text-ink">Events I host</h3>
        <Card>
          <CardBody className="p-0">
            {hosting.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted">
                No upcoming events yet. Add one above to show it on the map, your profile, and the
                public events page.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {hosting.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3.5">
                    <div className="flex min-w-0 gap-3">
                      {e.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.image_url}
                          alt=""
                          className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-paper-deep text-2xl">
                          {EVENT_TYPE_META[e.event_type ?? "other"].emoji}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{e.name}</p>
                        <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-accent-dark">
                          {formatDateRange(e.start_date, e.end_date)}
                          {e.start_time &&
                            ` · ${e.start_time.slice(0, 5)}–${(e.end_time ?? "").slice(0, 5)}`}
                        </p>
                        <p className="mt-1 flex items-start gap-1 text-[13px] text-ink-soft">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted" />
                          {e.location_name}
                        </p>
                        {e.collaborators.length > 0 && (
                          <p className="mt-1 text-[12px] text-muted">
                            {e.collaborators.filter((c) => c.status === "confirmed").length} confirmed
                            {e.collaborators.some((c) => c.status === "invited") &&
                              `, ${e.collaborators.filter((c) => c.status === "invited").length} pending`}
                            {" · "}
                            {e.interestedCount} interested
                          </p>
                        )}
                        {e.collaborators.length === 0 && e.interestedCount > 0 && (
                          <p className="mt-1 text-[12px] text-muted">{e.interestedCount} interested</p>
                        )}
                      </div>
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
      </section>

      {/* ---- Confirmed collaborations ---- */}
      {attending.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-sm font-bold text-ink">Events {truckName} is joining</h3>
          <Card>
            <CardBody className="p-0">
              <div className="divide-y divide-line">
                {attending.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <EventTypeBadge type={e.event_type} />
                        <p className="font-semibold text-ink">{e.name}</p>
                      </div>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-accent-dark">
                        {formatDateRange(e.start_date, e.end_date)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-soft">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted" />
                        {e.location_name}
                      </p>
                    </div>
                    <span className="flex flex-shrink-0 items-center gap-1 rounded-lg bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                      <Check className="h-3.5 w-3.5" />
                      Confirmed
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
