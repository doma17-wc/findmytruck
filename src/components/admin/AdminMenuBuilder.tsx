"use client";

import { useMemo, useState } from "react";
import { Ban, Check, Plus, Trash2 } from "lucide-react";
import type { Truck } from "@/lib/types";
import { normalizeMenuItems, groupMenu, type MenuItem } from "@/lib/menu";
import { saveTruckMenuAction } from "@/app/admin/actions";
import { cn } from "./ui";

interface EditItem {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  sold_out: boolean;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

function toEditItems(raw: MenuItem[]): EditItem[] {
  return groupMenu(raw).flatMap((g) =>
    g.items.map((it) => ({
      id: uid(),
      name: it.name,
      description: it.description ?? "",
      price: it.price === null ? "" : String(it.price),
      category: g.category,
      sold_out: Boolean(it.sold_out),
    }))
  );
}

function serialize(items: EditItem[]): MenuItem[] {
  return normalizeMenuItems(
    items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name,
        price: it.price,
        description: it.description || null,
        category: it.category || null,
        sold_out: it.sold_out,
      }))
  );
}

export default function AdminMenuBuilder({ truck }: { truck: Truck }) {
  const initial = useMemo(() => normalizeMenuItems(truck.menu_items), [truck.menu_items]);
  const [items, setItems] = useState<EditItem[]>(() => toEditItems(initial));
  const [categories, setCategories] = useState<string[]>(() => {
    const cats = groupMenu(initial).map((g) => g.category);
    return cats.length ? cats : [""];
  });
  const [drafts, setDrafts] = useState<Record<string, { name: string; description: string; price: string }>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const savedSnapshot = useMemo(() => JSON.stringify(serialize(toEditItems(initial))), [initial]);
  const dirty = JSON.stringify(serialize(items)) !== savedSnapshot;

  const draftFor = (cat: string) => drafts[cat] ?? { name: "", description: "", price: "" };
  const setDraft = (cat: string, patch: Partial<{ name: string; description: string; price: string }>) =>
    setDrafts((prev) => ({ ...prev, [cat]: { ...draftFor(cat), ...patch } }));

  const updateItem = (id: string, patch: Partial<EditItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const deleteItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const addDish = (cat: string) => {
    const d = draftFor(cat);
    if (!d.name.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: uid(), name: d.name.trim(), description: d.description.trim(), price: d.price.trim(), category: cat, sold_out: false },
    ]);
    setDrafts((prev) => ({ ...prev, [cat]: { name: "", description: "", price: "" } }));
  };

  const addCategory = () => {
    const name = window.prompt("Category name (e.g. Tacos, Drinks)")?.trim();
    if (!name || categories.includes(name)) return;
    setCategories((prev) => [...prev.filter((c) => c !== ""), name]);
  };

  const renameCategory = (from: string, to: string) => {
    setCategories((prev) => prev.map((c) => (c === from ? to : c)));
    setItems((prev) => prev.map((it) => (it.category === from ? { ...it, category: to } : it)));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const res = await saveTruckMenuAction(truck.id, serialize(items));
    setSaving(false);
    setMsg(res?.error ? res.error : "Menu saved.");
    setTimeout(() => setMsg(null), 2500);
  };

  const priceCell =
    "w-24 rounded-lg border border-line bg-card py-1.5 pl-10 pr-2 text-right font-mono text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const rows = items.filter((it) => it.category === cat);
        return (
          <div key={cat || "__uncat__"} className="rounded-2xl border border-line bg-card p-4">
            {cat === "" ? (
              rows.length > 0 && (
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Uncategorised</h4>
              )
            ) : (
              <input
                value={cat}
                onChange={(e) => renameCategory(cat, e.target.value)}
                className="mb-2 w-full bg-transparent font-display text-base font-bold text-ink outline-none"
                placeholder="Category name"
              />
            )}

            <div className="divide-y divide-line">
              {rows.map((it) => (
                <div key={it.id} className={cn("flex items-start gap-2 py-2.5", it.sold_out && "opacity-45")}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      value={it.name}
                      onChange={(e) => updateItem(it.id, { name: e.target.value })}
                      placeholder="Dish name"
                      className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
                    />
                    <input
                      value={it.description}
                      onChange={(e) => updateItem(it.id, { description: e.target.value })}
                      placeholder="Short description"
                      className="w-full bg-transparent text-sm text-ink-soft outline-none placeholder:text-muted"
                    />
                  </div>
                  <div className="relative flex-shrink-0">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                      CHF
                    </span>
                    <input
                      value={it.price}
                      onChange={(e) => updateItem(it.id, { price: e.target.value })}
                      inputMode="decimal"
                      placeholder="0.00"
                      aria-label="Price in CHF"
                      className={priceCell}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateItem(it.id, { sold_out: !it.sold_out })}
                    title={it.sold_out ? "Mark available" : "Mark sold out"}
                    className={cn(
                      "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition",
                      it.sold_out ? "border-accent bg-accent/10 text-accent-dark" : "border-line text-muted hover:text-ink"
                    )}
                  >
                    {it.sold_out ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(it.id)}
                    aria-label="Delete dish"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent/40 hover:text-accent-dark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3">
              <input
                value={draftFor(cat).name}
                onChange={(e) => setDraft(cat, { name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addDish(cat)}
                placeholder="Dish name"
                className="min-w-[8rem] flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <input
                value={draftFor(cat).description}
                onChange={(e) => setDraft(cat, { description: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && addDish(cat)}
                placeholder="Description"
                className="min-w-[8rem] flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted">
                  CHF
                </span>
                <input
                  value={draftFor(cat).price}
                  onChange={(e) => setDraft(cat, { price: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addDish(cat)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-24 rounded-lg border border-line bg-card py-2 pl-10 pr-2 text-right font-mono text-sm outline-none focus:border-accent"
                />
              </div>
              <button
                type="button"
                onClick={() => addDish(cat)}
                className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white transition hover:bg-ink-soft"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addCategory}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-paper transition hover:border-accent/40"
        >
          <Plus className="h-4 w-4" /> Add category
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : dirty ? "Save menu" : "Menu saved"}
        </button>
        {msg && <span className="text-sm font-semibold text-live">{msg}</span>}
      </div>
    </div>
  );
}
