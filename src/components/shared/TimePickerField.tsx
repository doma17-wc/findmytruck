"use client";

import { useEffect, useRef, useState } from "react";
import WheelTimePicker from "./WheelTimePicker";

interface TimePickerFieldProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  triggerClassName: string;
}

/** A compact trigger button that opens an iOS-style wheel picker popover.
 * Drop-in replacement for `<input type="time">` with the same
 * value/onChange contract. */
export default function TimePickerField({
  value,
  onChange,
  disabled,
  ariaLabel,
  triggerClassName,
}: TimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const commitAndClose = () => {
      onChange(draft);
      setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) commitAndClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") commitAndClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, draft, onChange]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {value}
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 rounded-2xl border border-line bg-card p-3 shadow-card-hover">
          <WheelTimePicker value={draft} onChange={setDraft} ariaLabel={ariaLabel} />
          <button
            type="button"
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-lg bg-accent py-1.5 text-xs font-bold text-white transition hover:bg-accent-dark"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
