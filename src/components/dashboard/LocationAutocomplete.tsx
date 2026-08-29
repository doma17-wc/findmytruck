"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { GEOCODE_COUNTRY } from "@/lib/cities";
import { cn } from "./ui";

export interface PlacePick {
  name: string;
  lat: number;
  lng: number;
}

interface GeocodeFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
}

interface Props {
  value: string;
  /** Free typing — the caller should drop any stored coordinates here. */
  onChange: (value: string) => void;
  /** A suggestion was picked — the caller should store the coordinates. */
  onPick: (pick: PlacePick) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  /** Set right after a pick so the value-effect doesn't re-open the dropdown. */
  const skipNextRef = useRef(false);
  /** Only search once the user has actually typed in this field (not for a
   * pre-filled saved value on mount). */
  const typedRef = useRef(false);
  const listboxId = useId();

  const handleChange = (next: string) => {
    typedRef.current = true;
    onChange(next);
  };

  // Debounced fetch whenever the text value changes through typing.
  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (!typedRef.current) return;

    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${token}&country=${GEOCODE_COUNTRY}&limit=5&autocomplete=true` +
        `&language=de,fr,it,en&types=address,poi,place,locality,neighborhood`;

      try {
        const res = await fetch(url, { signal: ctrl.signal });
        const json = await res.json();
        const features: GeocodeFeature[] = json.features ?? [];
        setResults(features);
        setActive(-1);
        setOpen(features.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // Close on outside click / tap.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = useCallback(
    (f: GeocodeFeature) => {
      skipNextRef.current = true;
      const name = f.text || f.place_name.split(",")[0];
      onChange(name);
      onPick({ name, lat: f.center[1], lng: f.center[0] });
      setOpen(false);
      setResults([]);
      setActive(-1);
    },
    [onChange, onPick]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      if (active >= 0 && active < results.length) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        autoComplete="off"
        className={className}
      />

      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-40 max-h-64 overflow-auto rounded-xl border border-line bg-card py-1 shadow-lg"
        >
          {results.map((f, i) => (
            <li key={f.id || i} role="option" aria-selected={i === active}>
              <button
                type="button"
                // pointerdown fires before the input blur, so the pick always lands.
                onPointerDown={(e) => {
                  e.preventDefault();
                  choose(f);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "block w-full px-3.5 py-2.5 text-left text-sm leading-snug text-ink transition",
                  i === active ? "bg-accent/10" : "hover:bg-paper-deep"
                )}
              >
                <span className="font-semibold">{f.text}</span>
                <span className="block text-xs text-muted">
                  {f.place_name.replace(/^[^,]+,\s*/, "")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && value.trim().length >= 3 && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
          …
        </span>
      )}
    </div>
  );
}
