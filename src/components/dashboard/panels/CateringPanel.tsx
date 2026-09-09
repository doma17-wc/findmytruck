"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Truck } from "@/lib/types";
import { normalizeCateringOfferings, normalizeCateringPhotos, type CateringOffering } from "@/lib/catering";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/imageResize";
import { PHOTO_BUCKET, storagePathFromPublicUrl } from "@/lib/storage";
import {
  setCateringAvailableAction,
  saveCateringAction,
  addCateringPhotoAction,
  deleteCateringPhotoAction,
  reorderCateringPhotosAction,
  setCoverCateringPhotoAction,
} from "@/app/dashboard/actions";
import { Card, CardBody, useToast, cn, dashInput } from "../ui";
import PhotoGalleryManager from "@/components/shared/PhotoGalleryManager";

async function uploadCateringPhoto(truckId: string, file: File): Promise<string> {
  const supabase = createClient();
  const { blob, ext, contentType } = await resizeImage(file, 1600);
  const path = `${truckId}/catering-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { cacheControl: "3600", upsert: false, contentType });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function removeCateringPhotoFromStorage(url: string) {
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  await createClient().storage.from(PHOTO_BUCKET).remove([path]);
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

interface EditOffering extends CateringOffering {
  id: string;
}

function toEditOfferings(raw: CateringOffering[]): EditOffering[] {
  return raw.map((o) => ({ ...o, id: uid() }));
}

export default function CateringPanel({
  truckId,
  truck,
  ownerEmail,
}: {
  truckId: string;
  truck: Truck;
  ownerEmail: string;
}) {
  const toast = useToast();

  const [available, setAvailable] = useState(Boolean(truck.catering_available));
  const [togglePending, startToggle] = useTransition();

  const [description, setDescription] = useState(truck.catering_description ?? "");
  const [area, setArea] = useState(truck.catering_area ?? "");
  const [minGuests, setMinGuests] = useState(
    truck.catering_min_guests != null ? String(truck.catering_min_guests) : ""
  );
  const [maxGuests, setMaxGuests] = useState(
    truck.catering_max_guests != null ? String(truck.catering_max_guests) : ""
  );
  const [contactEmail, setContactEmail] = useState(truck.catering_contact_email ?? ownerEmail ?? "");
  const [contactPhone, setContactPhone] = useState(truck.catering_contact_phone ?? truck.phone ?? "");
  const [offerings, setOfferings] = useState<EditOffering[]>(() =>
    toEditOfferings(normalizeCateringOfferings(truck.catering_offerings))
  );
  const [saving, startSave] = useTransition();
  const cateringPhotos = normalizeCateringPhotos(truck.catering_photos);

  const toggleAvailable = () => {
    const next = !available;
    setAvailable(next);
    startToggle(async () => {
      const res = await setCateringAvailableAction(truckId, next);
      if (res.error) {
        setAvailable(!next);
        toast(res.error, "error");
      } else {
        toast(next ? "Catering is now listed publicly" : "Catering hidden from your public profile");
      }
    });
  };

  const updateOffering = (id: string, patch: Partial<CateringOffering>) =>
    setOfferings((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const removeOffering = (id: string) => setOfferings((prev) => prev.filter((o) => o.id !== id));

  const addOffering = () =>
    setOfferings((prev) => [...prev, { id: uid(), name: "", description: "", price: "" }]);

  const save = () => {
    startSave(async () => {
      const res = await saveCateringAction(truckId, {
        description,
        area,
        minGuests,
        maxGuests,
        contactEmail,
        contactPhone,
        offerings: offerings.map(({ id: _id, ...rest }) => rest),
      });
      if (res.error) toast(res.error, "error");
      else toast("Catering info saved");
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Available for catering</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {available
                  ? "Your catering info is visible on your public profile and listed on /catering."
                  : "Turn this on to advertise catering — nothing shows publicly until you do."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={available}
              disabled={togglePending}
              onClick={toggleAvailable}
              className={cn(
                "relative h-7 w-12 flex-shrink-0 rounded-full transition disabled:opacity-60",
                available ? "bg-accent" : "bg-paper-deep"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                  available ? "translate-x-[22px]" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-base font-bold text-ink">About your catering</h2>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What you offer, your style, what makes you a great fit for events…"
              className={dashInput}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Coverage area</span>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Deutschschweiz, Zürich + Umgebung, ganze Schweiz"
                className={dashInput}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Min guests</span>
                <input
                  value={minGuests}
                  onChange={(e) => setMinGuests(e.target.value)}
                  inputMode="numeric"
                  placeholder="20"
                  className={dashInput}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Max guests</span>
                <input
                  value={maxGuests}
                  onChange={(e) => setMaxGuests(e.target.value)}
                  inputMode="numeric"
                  placeholder="300"
                  className={dashInput}
                />
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">Offerings / packages</h2>
            <button
              type="button"
              onClick={addOffering}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-sm font-semibold text-ink-soft transition hover:border-accent/40"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {offerings.length === 0 && (
            <p className="text-sm text-muted">
              Optional — describe packages like &ldquo;Small event (up to 50 guests)&rdquo; or leave
              this empty and rely on your description above.
            </p>
          )}
          <div className="space-y-3">
            {offerings.map((o) => (
              <div key={o.id} className="rounded-xl border border-line bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={o.name}
                    onChange={(e) => updateOffering(o.id, { name: e.target.value })}
                    placeholder="Package name (e.g. Standard, Premium, Kids party)"
                    className="min-w-[10rem] flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <input
                    value={o.price ?? ""}
                    onChange={(e) => updateOffering(o.id, { price: e.target.value })}
                    placeholder="CHF 15/person or on request"
                    className="w-48 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => removeOffering(o.id)}
                    aria-label="Remove offering"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-accent/40 hover:text-accent-dark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={o.description ?? ""}
                  onChange={(e) => updateOffering(o.id, { description: e.target.value })}
                  rows={2}
                  placeholder="What's included"
                  className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-display text-base font-bold text-ink">Contact for catering</h2>
          <p className="text-sm text-muted">
            How customers reach you directly — FindMyTruck never handles the booking.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Email</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="catering@yourtruck.ch"
                className={dashInput}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink">Phone</span>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+41 79 000 00 00"
                className={dashInput}
              />
            </label>
          </div>
        </CardBody>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-accent-dark disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </div>

      <Card>
        <CardBody className="space-y-3">
          <h2 className="font-display text-base font-bold text-ink">Catering photos</h2>
          <p className="text-sm text-muted">Events you&apos;ve catered — shown on your profile and on /catering.</p>
          <PhotoGalleryManager
            truckId={truckId}
            photos={cateringPhotos}
            uploadToStorage={uploadCateringPhoto}
            removeFromStorage={removeCateringPhotoFromStorage}
            onAdd={(url) => addCateringPhotoAction(truckId, url)}
            onDelete={(id) => deleteCateringPhotoAction(truckId, id)}
            onReorder={(ids) => reorderCateringPhotosAction(truckId, ids)}
            onSetCover={(id) => setCoverCateringPhotoAction(truckId, id)}
          />
        </CardBody>
      </Card>
    </div>
  );
}
