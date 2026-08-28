"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";
import { groupMenu, type MenuItem } from "@/lib/menu";

interface Dish {
  id: string;
  name: string;
  price: string;
  description: string;
}

interface Section {
  id: string;
  category: string;
  items: Dish[];
}

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

function emptyDish(): Dish {
  return { id: uid(), name: "", price: "", description: "" };
}

function buildSections(initial: MenuItem[]): Section[] {
  const groups = groupMenu(initial);
  const sections: Section[] = groups.map((g) => ({
    id: uid(),
    category: g.category,
    items: g.items.map((it) => ({
      id: uid(),
      name: it.name,
      price: it.price === null ? "" : String(it.price),
      description: it.description ?? "",
    })),
  }));
  if (sections.length === 0 || sections[0].category !== "") {
    sections.unshift({ id: uid(), category: "", items: [] });
  }
  return sections;
}

function serialize(sections: Section[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const section of sections) {
    for (const dish of section.items) {
      const name = dish.name.trim();
      if (!name) continue;
      const priceNum = dish.price.trim() === "" ? null : Number(dish.price.replace(",", "."));
      out.push({
        name,
        price: priceNum !== null && Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : null,
        description: dish.description.trim() || null,
        category: section.category.trim() || null,
      });
    }
  }
  return out;
}

const inputBase =
  "rounded-lg border border-neutral-200 px-2.5 py-1.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function MenuBuilder({ name, initial }: { name: string; initial: MenuItem[] }) {
  const [sections, setSections] = useState<Section[]>(() => buildSections(initial));
  const [drag, setDrag] = useState<{ section: number; from: number } | null>(null);

  const serialized = useMemo(() => JSON.stringify(serialize(sections)), [sections]);

  const updateSection = (sIdx: number, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s, i) => (i === sIdx ? { ...s, ...patch } : s)));

  const updateDish = (sIdx: number, dIdx: number, patch: Partial<Dish>) =>
    setSections((prev) =>
      prev.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.map((d, j) => (j === dIdx ? { ...d, ...patch } : d)) } : s
      )
    );

  const addDish = (sIdx: number) =>
    setSections((prev) => prev.map((s, i) => (i === sIdx ? { ...s, items: [...s.items, emptyDish()] } : s)));

  const removeDish = (sIdx: number, dIdx: number) =>
    setSections((prev) =>
      prev.map((s, i) => (i === sIdx ? { ...s, items: s.items.filter((_, j) => j !== dIdx) } : s))
    );

  const moveDish = (sIdx: number, from: number, to: number) =>
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        if (to < 0 || to >= s.items.length) return s;
        const items = [...s.items];
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        return { ...s, items };
      })
    );

  const addCategory = () =>
    setSections((prev) => [...prev, { id: uid(), category: "", items: [emptyDish()] }]);

  const removeSection = (sIdx: number) => setSections((prev) => prev.filter((_, i) => i !== sIdx));

  return (
    <div>
      <input type="hidden" name={name} value={serialized} />

      <div className="space-y-4">
        {sections.map((section, sIdx) => {
          const showHeader = sIdx > 0;
          return (
            <div
              key={section.id}
              className={showHeader ? "rounded-xl border border-neutral-200 p-3" : ""}
            >
              {showHeader && (
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={section.category}
                    onChange={(e) => updateSection(sIdx, { category: e.target.value })}
                    placeholder="Category name (e.g. Burgers)"
                    className={`${inputBase} flex-1 font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(sIdx)}
                    aria-label="Remove category"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {section.items.length === 0 ? (
                <p className="py-1 text-xs text-neutral-400">No dishes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {section.items.map((dish, dIdx) => (
                    <li
                      key={dish.id}
                      onDragOver={(e) => {
                        if (!drag || drag.section !== sIdx || drag.from === dIdx) return;
                        e.preventDefault();
                        moveDish(sIdx, drag.from, dIdx);
                        setDrag({ section: sIdx, from: dIdx });
                      }}
                      className={`rounded-lg border border-neutral-100 bg-neutral-50/60 p-2 ${
                        drag && drag.section === sIdx && drag.from === dIdx ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          draggable
                          onDragStart={() => setDrag({ section: sIdx, from: dIdx })}
                          onDragEnd={() => setDrag(null)}
                          className="mt-1.5 flex-shrink-0 cursor-grab touch-none text-neutral-300 active:cursor-grabbing"
                          aria-hidden
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              value={dish.name}
                              onChange={(e) => updateDish(sIdx, dIdx, { name: e.target.value })}
                              placeholder="Dish name"
                              className={`${inputBase} min-w-0 flex-1`}
                            />
                            <div className="relative flex-shrink-0">
                              <input
                                value={dish.price}
                                onChange={(e) => updateDish(sIdx, dIdx, { price: e.target.value })}
                                inputMode="decimal"
                                placeholder="0.00"
                                aria-label="Price in CHF"
                                className={`${inputBase} w-24 pl-9 text-right tabular-nums`}
                              />
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400">
                                CHF
                              </span>
                            </div>
                          </div>
                          <input
                            value={dish.description}
                            onChange={(e) => updateDish(sIdx, dIdx, { description: e.target.value })}
                            placeholder="Short description (optional)"
                            className={`${inputBase} w-full`}
                          />
                        </div>

                        <div className="flex flex-shrink-0 flex-col items-center">
                          <button
                            type="button"
                            onClick={() => moveDish(sIdx, dIdx, dIdx - 1)}
                            disabled={dIdx === 0}
                            aria-label="Move up"
                            className="text-neutral-300 transition hover:text-neutral-600 disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDish(sIdx, dIdx, dIdx + 1)}
                            disabled={dIdx === section.items.length - 1}
                            aria-label="Move down"
                            className="text-neutral-300 transition hover:text-neutral-600 disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDish(sIdx, dIdx)}
                            aria-label="Remove dish"
                            className="mt-0.5 text-neutral-300 transition hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => addDish(sIdx)}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand transition hover:brightness-90"
              >
                <Plus className="h-4 w-4" /> Add dish
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addCategory}
        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
      >
        <Plus className="h-4 w-4" /> Add category
      </button>
    </div>
  );
}
