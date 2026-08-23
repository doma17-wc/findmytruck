"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Truck } from "@/lib/types";
import { saveOwnTruckAction, type DashboardFormState } from "@/app/(site)/dashboard/actions";

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

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px] transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export default function DashboardTruckForm({ truck }: { truck: Truck }) {
  const [state, formAction] = useFormState<DashboardFormState, FormData>(saveOwnTruckAction, {});

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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuisine (comma-separated)">
          <input
            name="cuisine_type"
            defaultValue={truck.cuisine_type?.join(", ")}
            className={inputClass}
            placeholder="Burgers, American"
          />
        </Field>
        <Field label="Price range">
          <input
            name="price_range"
            defaultValue={truck.price_range ?? ""}
            className={inputClass}
            placeholder="$$"
          />
        </Field>
      </div>

      <Field label="Languages (comma-separated)">
        <input
          name="languages"
          defaultValue={truck.languages?.join(", ")}
          className={inputClass}
          placeholder="de, en"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Logo URL">
          <input name="logo_url" defaultValue={truck.logo_url ?? ""} className={inputClass} />
        </Field>
        <Field label="Cover photo URL">
          <input
            name="cover_photo_url"
            defaultValue={truck.cover_photo_url ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Menu (text)">
        <textarea
          name="menu_text"
          defaultValue={truck.menu_text ?? ""}
          rows={4}
          className={inputClass}
        />
      </Field>

      <Field label="Menu photo URL">
        <input name="menu_photo_url" defaultValue={truck.menu_photo_url ?? ""} className={inputClass} />
      </Field>

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
