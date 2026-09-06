"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addTruckAction } from "@/app/dashboard/actions";
import { dashInput } from "./ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent py-3 text-base font-bold text-white shadow-sm transition hover:bg-accent-dark active:scale-[0.99] disabled:opacity-60"
    >
      {pending ? "Setting up…" : "Add truck"}
    </button>
  );
}

export default function AddTruckForm() {
  const [state, formAction] = useFormState(addTruckAction, {});

  return (
    <form action={formAction} className="space-y-3">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}
      <input
        name="truck_name"
        placeholder="Truck name"
        required
        autoFocus
        className={dashInput}
      />
      <SubmitButton />
    </form>
  );
}
