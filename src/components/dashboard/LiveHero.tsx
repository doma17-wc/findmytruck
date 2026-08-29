"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { TruckSchedule } from "@/lib/types";
import { Beacon, cn } from "./ui";

function useLiveTimer(liveRow: TruckSchedule | null) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    if (!liveRow) return;
    const [h, m, s] = liveRow.start_time.split(":").map(Number);
    const start = new Date();
    start.setHours(h || 0, m || 0, s || 0, 0);

    const tick = () => {
      let diff = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
      const hh = Math.floor(diff / 3600);
      diff %= 3600;
      const mm = Math.floor(diff / 60);
      const ss = diff % 60;
      setElapsed(
        [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":")
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveRow]);

  return elapsed;
}

export default function LiveHero({
  live,
  liveRow,
  children,
}: {
  live: boolean;
  liveRow: TruckSchedule | null;
  children?: ReactNode;
}) {
  const elapsed = useLiveTimer(liveRow);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 text-white shadow-paper",
        live
          ? "bg-gradient-to-br from-[#15803d] via-[#16A34A] to-[#22c55e]"
          : "bg-gradient-to-br from-[#26231f] via-[#191817] to-[#3a3531]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Beacon live={live} />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">
              {live ? "You are live" : "You are offline"}
            </span>
          </div>
          <p className="mt-3 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
            {live ? elapsed : "--:--:--"}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {live
              ? liveRow?.location_name
                ? `Serving at ${liveRow.location_name}`
                : "Serving now"
              : "Start a service to appear on the map"}
          </p>
        </div>
      </div>

      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
