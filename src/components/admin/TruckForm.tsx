"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Truck } from "@/lib/types";
import { saveTruckAction, deleteTruckAction, type TruckFormState } from "@/app/admin/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white active:bg-brand-600 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-[15px] focus:border-brand focus:outline-none";

export default function TruckForm({ truck }: { truck?: Truck }) {
  const boundAction = saveTruckAction.bind(null, truck?.id ?? null);
  const [state, formAction] = useFormState<TruckFormState, FormData>(boundAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <Field label="Name *">
        <input name="name" defaultValue={truck?.name} required className={inputClass} />
      </Field>

      <Field label="Slug (URL path, auto-generated if blank)">
        <input name="slug" defaultValue={truck?.slug} className={inputClass} placeholder="e.g. smash-brothers" />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          defaultValue={truck?.description ?? ""}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuisine (comma-separated)">
          <input
            name="cuisine_type"
            defaultValue={truck?.cuisine_type?.join(", ")}
            className={inputClass}
            placeholder="Burgers, American"
          />
        </Field>
        <Field label="Price range">
          <input
            name="price_range"
            defaultValue={truck?.price_range ?? ""}
            className={inputClass}
            placeholder="$$"
          />
        </Field>
      </div>

      <Field label="Languages (comma-separated)">
        <input
          name="languages"
          defaultValue={truck?.languages?.join(", ")}
          className={inputClass}
          placeholder="de, en"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Logo URL">
          <input name="logo_url" defaultValue={truck?.logo_url ?? ""} className={inputClass} />
        </Field>
        <Field label="Cover photo URL">
          <input
            name="cover_photo_url"
            defaultValue={truck?.cover_photo_url ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Menu (text)">
        <textarea
          name="menu_text"
          defaultValue={truck?.menu_text ?? ""}
          rows={4}
          className={inputClass}
        />
      </Field>

      <Field label="Menu photo URL">
        <input name="menu_photo_url" defaultValue={truck?.menu_photo_url ?? ""} className={inputClass} />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Instagram">
          <input name="instagram" defaultValue={truck?.instagram ?? ""} className={inputClass} />
        </Field>
        <Field label="TikTok">
          <input name="tiktok" defaultValue={truck?.tiktok ?? ""} className={inputClass} />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={truck?.website ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Phone">
          <input name="phone" defaultValue={truck?.phone ?? ""} className={inputClass} />
        </Field>
        <Field label="Owner name">
          <input name="owner_name" defaultValue={truck?.owner_name ?? ""} className={inputClass} />
        </Field>
        <Field label="Owner email">
          <input name="owner_email" defaultValue={truck?.owner_email ?? ""} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Claim status">
          <select
            name="claim_status"
            defaultValue={truck?.claim_status ?? "unclaimed"}
            className={inputClass}
          >
            <option value="unclaimed">Unclaimed (public data)</option>
            <option value="pending">Pending verification</option>
            <option value="claimed">Claimed &amp; verified</option>
          </select>
        </Field>
        <Field label="Source region (home base)">
          <input
            name="source_region"
            defaultValue={truck?.source_region ?? ""}
            className={inputClass}
            placeholder="e.g. Zürich"
          />
        </Field>
      </div>

      <Field label="Source website (public link)">
        <input
          name="source_website"
          defaultValue={truck?.source_website ?? ""}
          className={inputClass}
          placeholder="https://…"
        />
      </Field>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={truck?.is_active ?? true}
          className="h-5 w-5 rounded border-neutral-300 text-brand focus:ring-brand"
        />
        <span className="text-sm font-medium text-neutral-700">Active (visible on public site)</span>
      </label>

      <SubmitButton label={truck ? "Save changes" : "Create truck"} />

      {truck && (
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete ${truck.name}? This cannot be undone.`)) {
              deleteTruckAction(truck.id);
            }
          }}
          className="w-full rounded-xl border border-red-200 py-3 text-sm font-semibold text-red-600"
        >
          Delete truck
        </button>
      )}
    </form>
  );
}
