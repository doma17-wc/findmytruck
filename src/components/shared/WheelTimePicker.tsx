"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const ITEM_HEIGHT = 36;
const VISIBLE_COUNT = 5;
const PAD_ROWS = Math.floor(VISIBLE_COUNT / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

interface WheelColumnProps {
  values: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

/** A single iOS-style spinning wheel column: scroll-snap drives touch and
 * mouse-wheel input, and a small pointer-driven momentum loop makes mouse
 * drag feel the same as a touch flick. */
function WheelColumn({ values, value, onChange, disabled, ariaLabel }: WheelColumnProps) {
  const scrollElRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const rafId = useRef<number>();
  const interacting = useRef(false);
  const dragRef = useRef<{
    startY: number;
    startScroll: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);
  const [centerIndex, setCenterIndex] = useState(() => Math.max(0, values.indexOf(value)));

  const stopMomentum = () => {
    if (rafId.current !== undefined) cancelAnimationFrame(rafId.current);
    rafId.current = undefined;
  };

  const commit = useCallback(
    (idx: number, smooth: boolean) => {
      const el = scrollElRef.current;
      const clamped = Math.min(values.length - 1, Math.max(0, idx));
      el?.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: smooth ? "smooth" : "auto" });
      setCenterIndex(clamped);
      if (values[clamped] !== value) onChange(values[clamped]);
    },
    [value, values, onChange]
  );

  // Sync to external value changes, but never mid-gesture (that would fight
  // the user's finger/mouse).
  useEffect(() => {
    if (interacting.current) return;
    const el = scrollElRef.current;
    if (!el) return;
    const idx = Math.max(0, values.indexOf(value));
    el.scrollTop = idx * ITEM_HEIGHT;
    setCenterIndex(idx);
  }, [value, values]);

  useEffect(() => stopMomentum, []);

  const scheduleSettle = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = scrollElRef.current;
      if (!el) return;
      commit(Math.round(el.scrollTop / ITEM_HEIGHT), true);
      interacting.current = false;
    }, 120);
  }, [commit]);

  const onScroll = () => {
    const el = scrollElRef.current;
    if (!el) return;
    setCenterIndex(Math.round(el.scrollTop / ITEM_HEIGHT));
    scheduleSettle();
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const el = scrollElRef.current;
    if (!el) return;
    stopMomentum();
    interacting.current = true;
    el.setPointerCapture(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startScroll: el.scrollTop,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    const el = scrollElRef.current;
    if (!state || !el) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - state.lastT;
    if (dt > 0) state.velocity = (e.clientY - state.lastY) / dt;
    state.lastY = e.clientY;
    state.lastT = now;
    el.scrollTop = state.startScroll - (e.clientY - state.startY);
    setCenterIndex(Math.round(el.scrollTop / ITEM_HEIGHT));
  };

  const endDrag = () => {
    const state = dragRef.current;
    const el = scrollElRef.current;
    dragRef.current = null;
    if (!state || !el) return;

    let velocity = state.velocity; // px/ms, positive = dragging finger down
    const step = () => {
      if (!el) return;
      velocity *= 0.94;
      el.scrollTop -= velocity * 16;
      setCenterIndex(Math.round(el.scrollTop / ITEM_HEIGHT));
      if (Math.abs(velocity) > 0.02) {
        rafId.current = requestAnimationFrame(step);
      } else {
        commit(Math.round(el.scrollTop / ITEM_HEIGHT), true);
        interacting.current = false;
      }
    };

    if (Math.abs(velocity) > 0.05) {
      rafId.current = requestAnimationFrame(step);
    } else {
      commit(Math.round(el.scrollTop / ITEM_HEIGHT), true);
      interacting.current = false;
    }
  };

  return (
    <div
      className="relative h-[180px] w-14 overflow-hidden"
      style={{
        WebkitMaskImage: "linear-gradient(to bottom, transparent, black 32%, black 68%, transparent)",
        maskImage: "linear-gradient(to bottom, transparent, black 32%, black 68%, transparent)",
      }}
    >
      <div
        ref={scrollElRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : 0}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp") commit(centerIndex - 1, true);
          if (e.key === "ArrowDown") commit(centerIndex + 1, true);
        }}
        className={`no-scrollbar h-full touch-pan-y select-none overflow-y-auto outline-none ${
          disabled ? "pointer-events-none opacity-40" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{ scrollSnapType: "y mandatory" }}
      >
        <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
        {values.map((v, i) => {
          const distance = Math.abs(i - centerIndex);
          return (
            <div
              key={v}
              role="option"
              aria-selected={i === centerIndex}
              onClick={() => !interacting.current && commit(i, true)}
              className={`flex items-center justify-center font-mono text-lg font-bold transition-opacity ${
                distance === 0 ? "text-ink" : "text-muted"
              }`}
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: "center",
                opacity: distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25,
              }}
            >
              {v}
            </div>
          );
        })}
        <div style={{ height: ITEM_HEIGHT * PAD_ROWS }} />
      </div>
    </div>
  );
}

interface WheelTimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

function toWheelParts(value: string): { hh: string; mm: string } {
  const [h, m] = value.split(":").map((n) => parseInt(n, 10));
  const hh = String(Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0).padStart(2, "0");
  const roundedM = Math.round((Number.isFinite(m) ? m : 0) / 5) * 5;
  const mm = String(roundedM % 60).padStart(2, "0");
  return { hh, mm };
}

/** iOS-style dual spinning-wheel time picker (hours 00-23, minutes in 5-min
 * steps). Controlled like a text input: `value`/`onChange` carry "HH:mm". */
export default function WheelTimePicker({ value, onChange, disabled, ariaLabel }: WheelTimePickerProps) {
  const { hh, mm } = toWheelParts(value);

  return (
    <div className="relative inline-flex items-center gap-1 rounded-xl border border-line bg-card px-2 py-1">
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-9 -translate-y-1/2 rounded-lg bg-accent/10 ring-1 ring-inset ring-accent/25" />
      <WheelColumn
        values={HOURS}
        value={hh}
        onChange={(h) => onChange(`${h}:${mm}`)}
        disabled={disabled}
        ariaLabel={`${ariaLabel ?? "Time"} — hour`}
      />
      <span className="relative z-10 pb-0.5 font-mono text-lg font-bold text-ink">:</span>
      <WheelColumn
        values={MINUTES}
        value={mm}
        onChange={(m) => onChange(`${hh}:${m}`)}
        disabled={disabled}
        ariaLabel={`${ariaLabel ?? "Time"} — minute`}
      />
    </div>
  );
}
