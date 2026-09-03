"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Beacon, cn } from "./ui";

/** Counts up from `startedAt` while boosted; shows "--:--:--" when not. */
function useBoostTimer(boosted: boolean, startedAt: string | null) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!boosted || !startedAt) return;
    const start = new Date(startedAt).getTime();

    const tick = () => {
      let diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hh = Math.floor(diff / 3600);
      diff %= 3600;
      const mm = Math.floor(diff / 60);
      const ss = diff % 60;
      setElapsed([hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":"));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [boosted, startedAt]);

  return elapsed;
}

function hhmm(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function BoostHero({
  boosted,
  startedAt,
  expiresAt,
  locationName,
  children,
}: {
  boosted: boolean;
  startedAt: string | null;
  expiresAt: string | null;
  locationName?: string | null;
  children?: ReactNode;
}) {
  const elapsed = useBoostTimer(boosted, startedAt);
  const until = hhmm(expiresAt);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white shadow-paper",
        boosted
          ? "bg-gradient-to-br from-[#15803d] via-[#16A34A] to-[#22c55e]"
          : "bg-gradient-to-br from-[#26231f] via-[#191817] to-[#3a3531]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Beacon live={boosted} />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">
              {boosted ? "You are boosted" : "Not boosted"}
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {boosted ? elapsed : "--:--:--"}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {boosted
              ? [
                  locationName ? `Confirmed at ${locationName}` : "Confirmed live now",
                  until ? `until ${until}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Boost when you're set up and serving to jump to the top of the map"}
          </p>
        </div>
      </div>

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
