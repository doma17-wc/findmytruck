"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import type { Truck } from "@/lib/types";
import {
  CUISINE_OPTIONS,
  PRICE_RANGE_OPTIONS,
  FOOD_TYPE_OPTIONS,
  DIETARY_OPTIONS,
  LANGUAGE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/truckOptions";
import { saveTruckAction, deleteTruckAction, type TruckFormState } from "@/app/admin/actions";
import { cn, adminInput } from "./ui";
import ImageDropzone from "@/components/dashboard/ImageDropzone";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (o: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
              active
                ? "border-accent bg-accent text-white"
                : "border-line bg-card text-ink-soft hover:border-accent/40"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent py-3 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-60"
    >
      {pending ? "Saving…" : isNew ? "Create truck" : "Save changes"}
    </button>
  );
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default function TruckForm({ truck }: { truck?: Truck }) {
  const router = useRouter();
  const isNew = !truck;
  const boundAction = saveTruckAction.bind(null, truck?.id ?? null);
  const [state, formAction] = useFormState<TruckFormState, FormData>(boundAction, {});

  const [cuisine, setCuisine] = useState<string[]>(truck?.cuisine_type ?? []);
  const [price, setPrice] = useState<string>(truck?.price_range ?? "");
  const [foodType, setFoodType] = useState<string[]>(truck?.food_type ?? []);
  const [dietary, setDietary] = useState<string[]>(truck?.dietary_options ?? []);
  const [languages, setLanguages] = useState<string[]>(truck?.languages ?? []);
  const [payment, setPayment] = useState<string[]>(truck?.payment_methods ?? []);
  const [features, setFeatures] = useState<string[]>(truck?.features ?? []);
  const [boostOn, setBoostOn] = useState<boolean>(Boolean(truck?.boosted));

  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    if (state.success) {
      setBanner("Saved.");
      const t = setTimeout(() => setBanner(null), 2500);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent-dark">
          {state.error}
        </p>
      )}
      {banner && (
        <p className="rounded-lg bg-live/10 px-3 py-2 text-sm font-semibold text-live">{banner}</p>
      )}

      {/* Basics */}
      <section className="space-y-4">
        <Field label="Name *">
          <input name="name" defaultValue={truck?.name} required className={adminInput} />
        </Field>
        <Field label="Slug" hint="URL path — auto from name if blank">
          <input name="slug" defaultValue={truck?.slug} className={adminInput} placeholder="smash-brothers" />
        </Field>
        <Field label="Description">
          <textarea name="description" defaultValue={truck?.description ?? ""} rows={3} className={adminInput} />
        </Field>

        <Group label="Cuisine">
          <Chips options={CUISINE_OPTIONS} selected={cuisine} onToggle={(o) => setCuisine((p) => toggle(p, o))} />
          <input type="hidden" name="cuisine_type" value={cuisine.join(",")} />
        </Group>

        <Group label="Price range">
          <div className="flex flex-wrap gap-1.5">
            {PRICE_RANGE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={price === value}
                onClick={() => setPrice((p) => (p === value ? "" : value))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  price === value
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-card text-ink-soft hover:border-accent/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="hidden" name="price_range" value={price} />
        </Group>

        <Group label="Food style">
          <Chips options={FOOD_TYPE_OPTIONS} selected={foodType} onToggle={(o) => setFoodType((p) => toggle(p, o))} />
          <input type="hidden" name="food_type" value={foodType.join(",")} />
        </Group>

        <Group label="Dietary options">
          <Chips options={DIETARY_OPTIONS} selected={dietary} onToggle={(o) => setDietary((p) => toggle(p, o))} />
          <input type="hidden" name="dietary_options" value={dietary.join(",")} />
        </Group>

        <Group label="Languages">
          <Chips options={LANGUAGE_OPTIONS} selected={languages} onToggle={(o) => setLanguages((p) => toggle(p, o))} />
          <input type="hidden" name="languages" value={languages.join(",")} />
        </Group>

        <Group label="Payment methods">
          <Chips options={PAYMENT_METHOD_OPTIONS} selected={payment} onToggle={(o) => setPayment((p) => toggle(p, o))} />
          <input type="hidden" name="payment_methods" value={payment.join(",")} />
        </Group>

        <Group label="Features">
          <Chips options={FEATURE_OPTIONS} selected={features} onToggle={(o) => setFeatures((p) => toggle(p, o))} />
          <input type="hidden" name="features" value={features.join(",")} />
        </Group>
      </section>

      {/* Contact & links */}
      <section className="space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Contact &amp; links</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Instagram">
            <input name="instagram" defaultValue={truck?.instagram ?? ""} className={adminInput} />
          </Field>
          <Field label="TikTok">
            <input name="tiktok" defaultValue={truck?.tiktok ?? ""} className={adminInput} />
          </Field>
          <Field label="Website">
            <input name="website" defaultValue={truck?.website ?? ""} className={adminInput} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Phone">
            <input name="phone" defaultValue={truck?.phone ?? ""} className={adminInput} />
          </Field>
          <Field label="Owner name">
            <input name="owner_name" defaultValue={truck?.owner_name ?? ""} className={adminInput} />
          </Field>
          <Field label="Owner email">
            <input name="owner_email" defaultValue={truck?.owner_email ?? ""} className={adminInput} />
          </Field>
        </div>
      </section>

      {/* Photos */}
      <section className="space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Photos</h3>
        {isNew ? (
          <>
            <p className="text-xs text-muted">
              Save the truck first, then re-open it to upload a logo and photo gallery. You can
              paste a logo URL here for now.
            </p>
            <Field label="Logo URL">
              <input name="logo_url" className={adminInput} />
            </Field>
          </>
        ) : (
          <ImageDropzone name="logo_url" label="Logo" truckId={truck!.id} initialUrl={truck!.logo_url} aspect="square" />
        )}
        <p className="text-xs text-muted">
          Cover photo and the rest of the gallery are managed in the &ldquo;Photo gallery&rdquo; section below.
        </p>
        <details className="rounded-xl border border-line bg-card p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft">
            Legacy menu text
          </summary>
          <textarea
            name="menu_text"
            defaultValue={truck?.menu_text ?? ""}
            rows={4}
            className={cn(adminInput, "mt-2")}
            placeholder="Free-text menu (only shown if there are no structured items)"
          />
        </details>
      </section>

      {/* Source / claim */}
      <section className="space-y-4">
        <h3 className="font-display text-sm font-bold text-ink">Source &amp; claim</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Claim status">
            <select name="claim_status" defaultValue={truck?.claim_status ?? "unclaimed"} className={adminInput}>
              <option value="unclaimed">Unclaimed (public data)</option>
              <option value="pending">Pending verification</option>
              <option value="claimed">Claimed &amp; verified</option>
            </select>
          </Field>
          <Field label="Source region (home base)">
            <input name="source_region" defaultValue={truck?.source_region ?? ""} className={adminInput} placeholder="Zürich" />
          </Field>
        </div>
        <Field label="Source website">
          <input name="source_website" defaultValue={truck?.source_website ?? ""} className={adminInput} placeholder="https://…" />
        </Field>
      </section>

      {/* Visibility & boost */}
      <section className="space-y-3 rounded-xl border border-line bg-card p-4">
        <h3 className="font-display text-sm font-bold text-ink">Visibility &amp; boost</h3>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={truck?.is_active ?? true}
            className="h-5 w-5 rounded border-line text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-ink-soft">Active (listed on the public site)</span>
        </label>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="paused"
            defaultChecked={Boolean(truck?.paused)}
            className="h-5 w-5 rounded border-line text-amber focus:ring-amber"
          />
          <span className="text-sm font-medium text-ink-soft">
            Paused — keep all data but hide everywhere on the public site
          </span>
        </label>
        <label className="flex items-center gap-2.5">
          <input
            type="checkbox"
            name="boost_enabled"
            checked={boostOn}
            onChange={(e) => setBoostOn(e.target.checked)}
            className="h-5 w-5 rounded border-line text-live focus:ring-live"
          />
          <span className="text-sm font-medium text-ink-soft">Force boosted (top of the map)</span>
        </label>
        {boostOn && (
          <Field label="Boost expires at" hint="defaults to +4h if blank">
            <input
              type="datetime-local"
              name="boost_expires_at"
              defaultValue={toLocalInput(truck?.boost_expires_at)}
              className={adminInput}
            />
          </Field>
        )}
      </section>

      <SubmitButton isNew={isNew} />

      {truck && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm(`Delete "${truck.name}" permanently? This cannot be undone.`)) return;
            const res = await deleteTruckAction(truck.id);
            if (res?.error) window.alert(res.error);
            else router.push("/admin");
          }}
          className="w-full rounded-xl border border-accent/30 py-3 text-sm font-bold text-accent-dark transition hover:bg-accent/5"
        >
          Delete truck
        </button>
      )}
    </form>
  );
}
