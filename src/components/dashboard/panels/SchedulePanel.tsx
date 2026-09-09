"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { ScheduleFrequency, TruckSchedule } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import { getMondayFirstDay } from "@/lib/geo";
import { publishTourAction, type TourSlotInput } from "@/app/dashboard/actions";
import { Card, CardBody, useToast, cn, segmentTrackClass, segmentButtonClass } from "../ui";
import LocationAutocomplete from "../LocationAutocomplete";
import TimePickerField from "@/components/shared/TimePickerField";

interface SlotDraft {
  /** Stable client-only key for React lists. */
  key: string;
  location: string;
  lat: number | null;
  lng: number | null;
  startTime: string;
  endTime: string;
  frequency: ScheduleFrequency;
  frequencyParity: "even" | "odd";
  frequencyWeeks: number[];
}

let slotCounter = 0;
const newKey = () => `slot-${Date.now()}-${slotCounter++}`;

function makeSlot(partial?: Partial<SlotDraft>): SlotDraft {
  return {
    key: newKey(),
    location: "",
    lat: null,
    lng: null,
    startTime: "11:00",
    endTime: "14:00",
    frequency: "weekly",
    frequencyParity: "odd",
    frequencyWeeks: [],
    ...partial,
  };
}

/** A sensible default for a *second* slot on a day so it doesn't collide with
 *  the typical lunch shift. */
function makeDinnerSlot(): SlotDraft {
  return makeSlot({ startTime: "17:00", endTime: "20:00" });
}

/** Group the saved recurring rows by weekday into editable slot drafts. */
function buildDays(schedules: TruckSchedule[]): SlotDraft[][] {
  return Array.from({ length: 7 }, (_, day) =>
    schedules
      .filter(
        (s) =>
          !s.specific_date &&
          s.day_of_week === day &&
          s.start_time !== s.end_time // skip region-marker placeholders
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .map((row) =>
        makeSlot({
          location: row.location_name,
          lat: row.location_lat,
          lng: row.location_lng,
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
          frequency: row.frequency ?? "weekly",
          frequencyParity: row.frequency_parity ?? "odd",
          frequencyWeeks: row.frequency_weeks ?? [],
        })
      )
  );
}

const FREQUENCY_OPTIONS: { key: ScheduleFrequency; label: string }[] = [
  { key: "weekly", label: "Every week" },
  { key: "alternate", label: "Alternating" },
  { key: "monthly_weeks", label: "Monthly" },
];

function FrequencyPicker({
  slot,
  patch,
}: {
  slot: SlotDraft;
  patch: (p: Partial<SlotDraft>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className={segmentTrackClass}>
        {FREQUENCY_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => patch({ frequency: opt.key })}
            className={segmentButtonClass(slot.frequency === opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {slot.frequency === "alternate" && (
        <div className={segmentTrackClass}>
          {(["odd", "even"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => patch({ frequencyParity: p })}
              className={segmentButtonClass(slot.frequencyParity === p, "capitalize")}
              title={p === "odd" ? "Weeks 1, 3, 5… of the year" : "Weeks 2, 4, 6… of the year"}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {slot.frequency === "monthly_weeks" && (
        <div className={segmentTrackClass}>
          {[1, 2, 3, 4].map((n) => {
            const active = slot.frequencyWeeks.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() =>
                  patch({
                    frequencyWeeks: active
                      ? slot.frequencyWeeks.filter((w) => w !== n)
                      : [...slot.frequencyWeeks, n].sort(),
                  })
                }
                className={segmentButtonClass(active)}
              >
                {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : "4th"}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const timeTrigger =
  "w-full rounded-lg border border-line bg-card px-2 py-2 text-left font-mono text-sm outline-none focus:border-accent";

export default function SchedulePanel({
  truckId,
  schedules,
}: {
  truckId: string;
  schedules: TruckSchedule[];
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const today = useMemo(() => getMondayFirstDay(), []);
  const [days, setDays] = useState<SlotDraft[][]>(() => buildDays(schedules));

  const patchSlot = (day: number, key: string, p: Partial<SlotDraft>) =>
    setDays((prev) =>
      prev.map((slots, d) =>
        d === day ? slots.map((s) => (s.key === key ? { ...s, ...p } : s)) : slots
      )
    );

  const addSlot = (day: number) =>
    setDays((prev) =>
      prev.map((slots, d) =>
        d === day ? [...slots, slots.length === 0 ? makeSlot() : makeDinnerSlot()] : slots
      )
    );

  const removeSlot = (day: number, key: string) =>
    setDays((prev) =>
      prev.map((slots, d) => (d === day ? slots.filter((s) => s.key !== key) : slots))
    );

  const publish = () => {
    const payload: TourSlotInput[] = [];
    days.forEach((slots, day) => {
      for (const s of slots) {
        if (!s.location.trim()) continue;
        payload.push({
          day,
          location: s.location,
          startTime: s.startTime,
          endTime: s.endTime,
          // A picked suggestion (or an untouched saved row) carries its
          // coordinates straight through; a null pair tells the server to
          // geocode the text.
          lat: s.lat,
          lng: s.lng,
          frequency: s.frequency,
          frequencyParity: s.frequency === "alternate" ? s.frequencyParity : null,
          frequencyWeeks: s.frequency === "monthly_weeks" ? s.frequencyWeeks : null,
        });
      }
    });
    startTransition(async () => {
      const res = await publishTourAction(truckId, payload);
      if (res.error) toast(res.error, "error");
      else toast("Tour published");
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-line">
            {DAY_LABELS.map((label, day) => {
              const slots = days[day];
              const isToday = day === today;
              return (
                <div key={day} className={cn("px-4 py-4", isToday && "bg-accent/5")}>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-bold",
                        isToday ? "text-accent-dark" : "text-ink"
                      )}
                    >
                      {label}
                    </span>
                    {isToday && (
                      <span className="text-[11px] font-semibold text-accent">· today</span>
                    )}
                    {slots.length === 0 && (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        Closed
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {slots.map((s, i) => (
                      <div
                        key={s.key}
                        className="rounded-xl border border-line bg-paper/60 p-3 space-y-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <LocationAutocomplete
                            value={s.location}
                            onChange={(location) =>
                              patchSlot(day, s.key, {
                                location,
                                // Manual edit invalidates any previously picked pin.
                                lat: null,
                                lng: null,
                              })
                            }
                            onPick={({ name, lat, lng }) =>
                              patchSlot(day, s.key, { location: name, lat, lng })
                            }
                            placeholder={
                              slots.length > 1
                                ? i === 0
                                  ? "Lunch location (e.g. Europaallee)"
                                  : "Dinner location"
                                : "Location (e.g. Europaallee)"
                            }
                            aria-label={`${label} slot ${i + 1} location`}
                            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => removeSlot(day, s.key)}
                            aria-label={`Remove ${label} slot ${i + 1}`}
                            className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-[5.5rem]">
                              <TimePickerField
                                value={s.startTime}
                                onChange={(startTime) => patchSlot(day, s.key, { startTime })}
                                ariaLabel={`${label} slot ${i + 1} start time`}
                                triggerClassName={timeTrigger}
                              />
                            </div>
                            <span className="text-xs text-muted">to</span>
                            <div className="w-[5.5rem]">
                              <TimePickerField
                                value={s.endTime}
                                onChange={(endTime) => patchSlot(day, s.key, { endTime })}
                                ariaLabel={`${label} slot ${i + 1} end time`}
                                triggerClassName={timeTrigger}
                              />
                            </div>
                          </div>
                          <FrequencyPicker
                            slot={s}
                            patch={(p) => patchSlot(day, s.key, p)}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-accent transition hover:bg-accent/10"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {slots.length === 0 ? "Add a stop" : "Add another slot for this day"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={publish}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-dark disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Publish tour
        </button>
        <p className="text-xs text-muted">
          Add several slots on one day for split services. Locations are placed on the map
          automatically.
        </p>
      </div>
    </div>
  );
}
