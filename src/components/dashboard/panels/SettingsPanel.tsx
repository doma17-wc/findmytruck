"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { Truck, TruckPhoto } from "@/lib/types";
import {
  CUISINE_OPTIONS,
  PRICE_RANGE_OPTIONS,
  FOOD_TYPE_OPTIONS,
  DIETARY_OPTIONS,
  LANGUAGE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  FEATURE_OPTIONS,
} from "@/lib/truckOptions";
import { saveSettingsAction, type ActionResult } from "@/app/dashboard/actions";
import { Card, CardBody, useToast, cn, dashInput } from "../ui";
import ImageDropzone from "../ImageDropzone";
import DashboardPhotoUploader from "../DashboardPhotoUploader";

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
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <h2 className="font-display text-base font-bold text-ink">{title}</h2>
        {children}
      </CardBody>
    </Card>
  );
}

function SaveBar() {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-4 z-10 flex justify-end">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-accent-dark disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </button>
    </div>
  );
}

export default function SettingsPanel({ truck, photos }: { truck: Truck; photos: TruckPhoto[] }) {
  const toast = useToast();
  const [state, formAction] = useFormState<ActionResult, FormData>(saveSettingsAction, {});

  const [cuisine, setCuisine] = useState<string[]>(truck.cuisine_type ?? []);
  const [price, setPrice] = useState<string>(truck.price_range ?? "");
  const [foodType, setFoodType] = useState<string[]>(truck.food_type ?? []);
  const [dietary, setDietary] = useState<string[]>(truck.dietary_options ?? []);
  const [languages, setLanguages] = useState<string[]>(truck.languages ?? []);
  const [payment, setPayment] = useState<string[]>(truck.payment_methods ?? []);
  const [features, setFeatures] = useState<string[]>(truck.features ?? []);

  useEffect(() => {
    if (state.success) toast("Settings saved");
    if (state.error) toast(state.error, "error");
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-5">
      <Section title="Profile">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Truck name</span>
          <input name="name" defaultValue={truck.name} required className={dashInput} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Description</span>
          <textarea name="description" defaultValue={truck.description ?? ""} rows={3} className={dashInput} />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Cuisine</span>
          <Chips options={CUISINE_OPTIONS} selected={cuisine} onToggle={(o) => setCuisine((p) => toggle(p, o))} />
          <input type="hidden" name="cuisine_type" value={cuisine.join(",")} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Price range</span>
          <div className="flex flex-wrap gap-2">
            {PRICE_RANGE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={price === value}
                onClick={() => setPrice(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
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
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Food style</span>
          <Chips options={FOOD_TYPE_OPTIONS} selected={foodType} onToggle={(o) => setFoodType((p) => toggle(p, o))} />
          <input type="hidden" name="food_type" value={foodType.join(",")} />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Languages</span>
          <Chips options={LANGUAGE_OPTIONS} selected={languages} onToggle={(o) => setLanguages((p) => toggle(p, o))} />
          <input type="hidden" name="languages" value={languages.join(",")} />
        </div>
      </Section>

      <Section title="Payment accepted">
        <Chips options={PAYMENT_METHOD_OPTIONS} selected={payment} onToggle={(o) => setPayment((p) => toggle(p, o))} />
        <input type="hidden" name="payment_methods" value={payment.join(",")} />
      </Section>

      <Section title="Dietary options">
        <Chips options={DIETARY_OPTIONS} selected={dietary} onToggle={(o) => setDietary((p) => toggle(p, o))} />
        <input type="hidden" name="dietary_options" value={dietary.join(",")} />
      </Section>

      <Section title="Features">
        <Chips options={FEATURE_OPTIONS} selected={features} onToggle={(o) => setFeatures((p) => toggle(p, o))} />
        <input type="hidden" name="features" value={features.join(",")} />
      </Section>

      <Section title="Contact & links">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Instagram</span>
            <input name="instagram" defaultValue={truck.instagram ?? ""} className={dashInput} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">TikTok</span>
            <input name="tiktok" defaultValue={truck.tiktok ?? ""} className={dashInput} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Website</span>
            <input name="website" defaultValue={truck.website ?? ""} className={dashInput} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Phone</span>
          <input name="phone" defaultValue={truck.phone ?? ""} className={dashInput} />
        </label>
      </Section>

      <Section title="Photos">
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageDropzone name="logo_url" label="Logo" truckId={truck.id} initialUrl={truck.logo_url} aspect="square" />
          <ImageDropzone name="cover_photo_url" label="Cover photo" truckId={truck.id} initialUrl={truck.cover_photo_url} aspect="wide" />
        </div>
        <ImageDropzone
          name="menu_photo_url"
          label="Menu photo"
          truckId={truck.id}
          initialUrl={truck.menu_photo_url}
          aspect="wide"
          hint="optional — a photo of your printed menu"
        />
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Gallery</span>
          <DashboardPhotoUploader truckId={truck.id} photos={photos} />
        </div>
      </Section>

      <Section title="Visibility">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={truck.is_active}
            className="h-5 w-5 rounded border-line text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-ink-soft">
            Listed on the public map and search
          </span>
        </label>
      </Section>

      <SaveBar />
    </form>
  );
}
