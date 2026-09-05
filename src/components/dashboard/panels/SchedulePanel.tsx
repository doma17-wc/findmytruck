"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { TruckSchedule } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import { getMondayFirstDay } from "@/lib/geo";
import { publishTourAction, type TourDayInput } from "@/app/dashboard/actions";
import { Card, CardBody, useToast, cn } from "../ui";
import LocationAutocomplete from "../LocationAutocomplete";
import TimePickerField from "@/components/shared/TimePickerField";

interface DayState {
  location: string;
  startTime: string;
  endTime: string;
  open: boolean;
  lat: number | null;
  lng: number | null;
}

function buildDays(schedules: TruckSchedule[]): DayState[] {
  return Array.from({ length: 7 }, (_, day) => {
    const row = schedules.find((s) => !s.specific_date && s.day_of_week === day);
    return {
      location: row?.location_name ?? "",
      startTime: row ? row.start_time.slice(0, 5) : "11:00",
      endTime: row ? row.end_time.slice(0, 5) : "14:00",
      open: Boolean(row),
      lat: row?.location_lat ?? null,
      lng: row?.location_lng ?? null,
    };
  });
}

export default function SchedulePanel({ schedules }: { schedules: TruckSchedule[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const today = useMemo(() => getMondayFirstDay(), []);
  const [days, setDays] = useState<DayState[]>(() => buildDays(schedules));

  const patch = (idx: number, p: Partial<DayState>) =>
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...p } : d)));

  const publish = () => {
    const payload: TourDayInput[] = days.map((d, day) => ({
      day,
      location: d.location,
      startTime: d.startTime,
      endTime: d.endTime,
      open: d.open,
      // Coordinates from a picked suggestion (or an untouched saved row) travel
      // straight through; a null pair tells the server to geocode the text.
      lat: d.lat,
      lng: d.lng,
    }));
    startTransition(async () => {
      const res = await publishTourAction(payload);
      if (res.error) toast(res.error, "error");
      else toast("Tour published");
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-line">
            {DAY_LABELS.map((label, idx) => {
              const d = days[idx];
              const isToday = idx === today;
              return (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[6rem_1fr_5.5rem_5.5rem_auto] sm:items-center sm:gap-3",
                    isToday && "bg-accent/5"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isToday ? "text-accent-dark" : "text-ink"
                    )}
                  >
                    {label}
                    {isToday && <span className="ml-1 text-[11px] font-semibold text-accent">· today</span>}
                  </span>

                  <LocationAutocomplete
                    value={d.location}
                    onChange={(location) =>
                      patch(idx, {
                        location,
                        // Manual edit invalidates any previously picked pin.
                        lat: null,
                        lng: null,
                        open: location ? true : d.open,
                      })
                    }
                    onPick={({ name, lat, lng }) =>
                      patch(idx, { location: name, lat, lng, open: true })
                    }
                    placeholder="Location (e.g. Europaallee)"
                    aria-label={`${label} location`}
                    className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                  />

                  <TimePickerField
                    value={d.startTime}
                    onChange={(startTime) => patch(idx, { startTime })}
                    disabled={!d.open}
                    ariaLabel={`${label} start time`}
                    triggerClassName="w-full rounded-lg border border-line bg-card px-2 py-2 text-left font-mono text-sm outline-none focus:border-accent disabled:opacity-40"
                  />

                  <TimePickerField
                    value={d.endTime}
                    onChange={(endTime) => patch(idx, { endTime })}
                    disabled={!d.open}
                    ariaLabel={`${label} end time`}
                    triggerClassName="w-full rounded-lg border border-line bg-card px-2 py-2 text-left font-mono text-sm outline-none focus:border-accent disabled:opacity-40"
                  />

                  <button
                    type="button"
                    onClick={() => patch(idx, { open: !d.open })}
                    aria-pressed={d.open}
                    className={cn(
                      "justify-self-start rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition sm:justify-self-auto",
                      d.open ? "bg-live/10 text-live" : "bg-paper-deep text-muted"
                    )}
                  >
                    {d.open ? "Open" : "Closed"}
                  </button>
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
        <p className="text-xs text-muted">Locations are placed on the map automatically.</p>
      </div>
    </div>
  );
}
