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
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import {
  saveSettingsAction,
  addOwnPhotoAction,
  deleteOwnPhotoAction,
  reorderOwnPhotosAction,
  setCoverOwnPhotoAction,
  type ActionResult,
} from "@/app/dashboard/actions";
import type { OwnedTruckLite } from "@/lib/dashboardTruck";
import { Card, CardBody, useToast, cn, dashInput } from "../ui";
import ImageDropzone from "../ImageDropzone";
import PhotoGalleryManager from "@/components/shared/PhotoGalleryManager";
import OwnerAccountPanel from "./OwnerAccountPanel";

async function uploadGalleryPhoto(truckId: string, file: File): Promise<string> {
  const supabase = createClient();
  const { blob, ext, contentType } = await resizeImage(file, 2000);
  const path = `${truckId}/gallery-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function removeGalleryPhotoFromStorage(url: string) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  await createClient().storage.from(PHOTO_BUCKET).remove([path]);
}

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

function PrivacyToggle({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
  hint: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-line bg-paper px-3.5 py-3">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-[13px] text-muted">{hint}</span>
      </span>
      <span className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="sr-only"
        />
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => setChecked((c) => !c)}
          className={cn(
            "relative h-6 w-11 rounded-full transition",
            checked ? "bg-accent" : "bg-paper-deep"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              checked ? "translate-x-[22px]" : "translate-x-0.5"
            )}
          />
        </button>
      </span>
    </label>
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

export default function SettingsPanel({
  truckId,
  truck,
  photos,
  ownedTrucks,
  ownerEmail,
}: {
  truckId: string;
  truck: Truck;
  photos: TruckPhoto[];
  ownedTrucks: OwnedTruckLite[];
  ownerEmail: string;
}) {
  const toast = useToast();
  const [state, formAction] = useFormState<ActionResult, FormData>(
    saveSettingsAction.bind(null, truckId),
    {}
  );

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
    <div className="space-y-5">
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

      <Section title="Privacy & contact visibility">
        <p className="text-sm text-ink-soft">
          Hidden by default. Turn these on to let customers reach you directly from your public
          profile — nothing here shows until you switch it on.
        </p>
        <PrivacyToggle
          name="show_phone"
          defaultChecked={Boolean(truck.show_phone)}
          label="Show phone number on public profile"
          hint={`Adds a "Call" button using the phone number above.`}
        />
        <PrivacyToggle
          name="show_email"
          defaultChecked={Boolean(truck.show_email)}
          label="Show email on public profile"
          hint={`Adds a "Contact" button using your account email (${ownerEmail || "not set"}).`}
        />
        <PrivacyToggle
          name="show_catering_contact"
          defaultChecked={Boolean(truck.show_catering_contact)}
          label="Show catering contact separately"
          hint="Independent of the toggles above — controls only the phone/email shown in the Catering section."
        />
      </Section>

      <Section title="Photos">
        <ImageDropzone
          name="logo_url"
          label="Logo"
          truckId={truck.id}
          initialUrl={truck.logo_url}
          aspect="square"
          hint="optional — shown as a small badge on your profile"
        />
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Gallery</span>
          <PhotoGalleryManager
            truckId={truck.id}
            photos={photos}
            uploadToStorage={uploadGalleryPhoto}
            removeFromStorage={removeGalleryPhotoFromStorage}
            onAdd={(url) => addOwnPhotoAction(truckId, url, "")}
            onDelete={(id) => deleteOwnPhotoAction(truckId, id)}
            onReorder={(ids) => reorderOwnPhotosAction(truckId, ids)}
            onSetCover={(id) => setCoverOwnPhotoAction(truckId, id)}
          />
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

    <div className="border-t border-line pt-6">
      <h2 className="mb-1 font-display text-lg font-extrabold text-ink">Account</h2>
      <p className="mb-4 text-sm text-muted">Pause your truck, change your password, or close your account.</p>
      <OwnerAccountPanel
        truckId={truckId}
        truckName={truck.name}
        paused={Boolean(truck.paused)}
        ownedTrucks={ownedTrucks}
        ownerEmail={ownerEmail}
      />
    </div>
    </div>
  );
}
