"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Truck } from "@/lib/types";
import { normalizeMenuItems } from "@/lib/menu";
import { saveOwnTruckAction, type DashboardFormState } from "@/app/(site)/dashboard/actions";
import ChipSelect from "./ChipSelect";
import ImageDropzone from "./ImageDropzone";
import MenuBuilder from "./MenuBuilder";
import {
  CUISINE_OPTIONS,
  PRICE_RANGE_OPTIONS,
  FOOD_TYPE_OPTIONS,
  DIETARY_OPTIONS,
  LANGUAGE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/truckOptions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white shadow-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:px-8"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function ChipField({
  label,
  name,
  options,
  selected,
  onToggle,
}: {
  label: string;
  name: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</span>
      <ChipSelect options={options} selected={selected} onToggle={onToggle} />
      <input type="hidden" name={name} value={selected.join(",")} />
    </div>
  );
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function DashboardTruckForm({ truck }: { truck: Truck }) {
  const [state, formAction] = useFormState<DashboardFormState, FormData>(saveOwnTruckAction, {});

  const [cuisineType, setCuisineType] = useState<string[]>(truck.cuisine_type ?? []);
  const [priceRange, setPriceRange] = useState<string>(truck.price_range ?? "");
  const [foodType, setFoodType] = useState<string[]>(truck.food_type ?? []);
  const [dietaryOptions, setDietaryOptions] = useState<string[]>(truck.dietary_options ?? []);
  const [languages, setLanguages] = useState<string[]>(truck.languages ?? []);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(truck.payment_methods ?? []);
  const [features, setFeatures] = useState<string[]>(truck.features ?? []);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <div className="rounded-lg bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-500">
        Public URL: <span className="font-mono text-neutral-700">findmytruck.ch/trucks/{truck.slug}</span>
      </div>

      <Field label="Name *">
        <input name="name" defaultValue={truck.name} required className={inputClass} />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={truck.description ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <ChipField
        label="Cuisine type"
        name="cuisine_type"
        options={CUISINE_OPTIONS}
        selected={cuisineType}
        onToggle={(opt) => setCuisineType((prev) => toggleValue(prev, opt))}
      />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">Price range</span>
        <div className="flex flex-wrap gap-2">
          {PRICE_RANGE_OPTIONS.map(({ value, label }) => {
            const active = priceRange === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setPriceRange(value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="price_range" value={priceRange} />
      </div>

      <ChipField
        label="Food type"
        name="food_type"
        options={FOOD_TYPE_OPTIONS}
        selected={foodType}
        onToggle={(opt) => setFoodType((prev) => toggleValue(prev, opt))}
      />

      <ChipField
        label="Dietary options"
        name="dietary_options"
        options={DIETARY_OPTIONS}
        selected={dietaryOptions}
        onToggle={(opt) => setDietaryOptions((prev) => toggleValue(prev, opt))}
      />

      <ChipField
        label="Languages spoken"
        name="languages"
        options={LANGUAGE_OPTIONS}
        selected={languages}
        onToggle={(opt) => setLanguages((prev) => toggleValue(prev, opt))}
      />

      <ChipField
        label="Payment methods"
        name="payment_methods"
        options={PAYMENT_METHOD_OPTIONS}
        selected={paymentMethods}
        onToggle={(opt) => setPaymentMethods((prev) => toggleValue(prev, opt))}
      />

      <ChipField
        label="Truck features"
        name="features"
        options={FEATURE_OPTIONS}
        selected={features}
        onToggle={(opt) => setFeatures((prev) => toggleValue(prev, opt))}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <ImageDropzone
          name="logo_url"
          label="Logo"
          truckId={truck.id}
          initialUrl={truck.logo_url}
          aspect="square"
        />
        <ImageDropzone
          name="cover_photo_url"
          label="Cover photo"
          truckId={truck.id}
          initialUrl={truck.cover_photo_url}
          aspect="wide"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-neutral-700">Menu</span>
        <MenuBuilder name="menu_items" initial={normalizeMenuItems(truck.menu_items)} />
      </div>

      <ImageDropzone
        name="menu_photo_url"
        label="Menu photo"
        truckId={truck.id}
        initialUrl={truck.menu_photo_url}
        aspect="wide"
        hint="optional — a photo of your printed menu"
      />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Instagram">
          <input name="instagram" defaultValue={truck.instagram ?? ""} className={inputClass} />
        </Field>
        <Field label="TikTok">
          <input name="tiktok" defaultValue={truck.tiktok ?? ""} className={inputClass} />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={truck.website ?? ""} className={inputClass} />
        </Field>
      </div>

      <Field label="Phone">
        <input name="phone" defaultValue={truck.phone ?? ""} className={inputClass} />
      </Field>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={truck.is_active}
          className="h-5 w-5 rounded border-neutral-300 text-brand focus:ring-brand"
        />
        <span className="text-sm font-medium text-neutral-700">Active (visible on public site)</span>
      </label>

      <SubmitButton />
    </form>
  );
}
