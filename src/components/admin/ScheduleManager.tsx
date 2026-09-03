"use client";

import { useState } from "react";
import type { TruckSchedule } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";
import { saveScheduleAction, deleteScheduleAction } from "@/app/admin/actions";
import LocationSearch from "./LocationSearch";

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none";

interface ScheduleManagerProps {
  truckId: string;
  schedules: TruckSchedule[];
}

interface DraftEntry {
  day_of_week: number;
  location_name: string;
  location_lat: number | null;
  location_lng: number | null;
  start_time: string;
  end_time: string;
}

const emptyDraft: DraftEntry = {
  day_of_week: 0,
  location_name: "",
  location_lat: null,
  location_lng: null,
  start_time: "11:30",
  end_time: "14:00",
};

export default function ScheduleManager({ truckId, schedules }: ScheduleManagerProps) {
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!draft.location_name || draft.location_lat === null || draft.location_lng === null) {
      alert("Pick a location from the search results first.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.set("day_of_week", String(draft.day_of_week));
    fd.set("location_name", draft.location_name);
    fd.set("location_lat", String(draft.location_lat));
    fd.set("location_lng", String(draft.location_lng));
    fd.set("start_time", draft.start_time);
    fd.set("end_time", draft.end_time);
    fd.set("is_recurring", "on");
    await saveScheduleAction(truckId, null, fd);
    setDraft(emptyDraft);
    setSubmitting(false);
  };

  const grouped = DAY_LABELS.map((label, idx) => ({
    label,
    idx,
    entries: schedules.filter((s) => s.day_of_week === idx),
  }));

  return (
    <div className="space-y-4">
      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-100">
        {grouped.map(({ label, idx, entries }) => (
          <div key={idx} className="px-4 py-3">
            <div className="text-sm font-semibold text-neutral-800">{label}</div>
            {entries.length === 0 ? (
              <div className="mt-1 text-sm text-neutral-400">No stop scheduled</div>
            ) : (
              <div className="mt-2 space-y-2">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{e.location_name}</span>
                      <span className="text-neutral-400"> · </span>
                      <span>
                        {e.start_time.slice(0, 5)} – {e.end_time.slice(0, 5)}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteScheduleAction(truckId, e.id)}
                      className="text-xs font-semibold text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-neutral-300 p-4">
        <h3 className="text-sm font-bold text-neutral-800">Add a stop</h3>
        <div className="mt-3 space-y-3">
          <select
            value={draft.day_of_week}
            onChange={(e) => setDraft((d) => ({ ...d, day_of_week: Number(e.target.value) }))}
            className={inputClass}
          >
            {DAY_LABELS.map((label, idx) => (
              <option key={idx} value={idx}>
                {label}
              </option>
            ))}
          </select>

          <LocationSearch
            onSelect={(loc) =>
              setDraft((d) => ({ ...d, location_name: loc.name, location_lat: loc.lat, location_lng: loc.lng }))
            }
          />
          {draft.location_lat !== null && (
            <p className="text-xs text-neutral-500">
              Selected: {draft.location_name} ({draft.location_lat.toFixed(4)}, {draft.location_lng!.toFixed(4)})
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">Start time</span>
              <input
                type="time"
                value={draft.start_time}
                onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-500">End time</span>
              <input
                type="time"
                value={draft.end_time}
                onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                className={inputClass}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add stop"}
          </button>
        </div>
      </div>
    </div>
  );
}
