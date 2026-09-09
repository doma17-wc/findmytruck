"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import type { OwnedTruckLite } from "@/lib/dashboardTruck";
import { setOwnTruckPausedAction } from "@/app/dashboard/actions";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import DeleteAccountSection from "@/components/account/DeleteAccountSection";
import { Card, CardBody, useToast } from "../ui";

/**
 * Account-level controls at the bottom of the dashboard Settings panel:
 *  - pause the current truck (and, for multi-truck owners, all of them)
 *  - change password
 *  - delete account (danger zone)
 */
export default function OwnerAccountPanel({
  truckId,
  truckName,
  paused,
  ownedTrucks,
  ownerEmail,
}: {
  truckId: string;
  truckName: string;
  paused: boolean;
  ownedTrucks: OwnedTruckLite[];
  ownerEmail: string;
}) {
  const toast = useToast();
  const [isPaused, setIsPaused] = useState(paused);
  const [pending, start] = useTransition();
  const multi = ownedTrucks.length > 1;

  const setOne = (next: boolean) => {
    setIsPaused(next);
    start(async () => {
      const res = await setOwnTruckPausedAction(truckId, next);
      if (res.error) {
        setIsPaused(!next);
        toast(res.error, "error");
      } else {
        toast(next ? "Truck paused" : "Truck is live again");
      }
    });
  };

  const setAll = (next: boolean) => {
    start(async () => {
      const results = await Promise.all(
        ownedTrucks.map((t) => setOwnTruckPausedAction(t.id, next))
      );
      const failed = results.find((r) => r.error);
      if (failed) {
        toast(failed.error ?? "Something went wrong", "error");
      } else {
        setIsPaused(next);
        toast(next ? "All your trucks are paused" : "All your trucks are live again");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardBody className="space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Pause this truck</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {isPaused ? (
                <>
                  <strong>{truckName}</strong> is paused — it won&apos;t be shown to customers on
                  the map, list, search or its profile page. Your menu, schedule and reviews are
                  kept.
                </>
              ) : (
                <>
                  Pausing hides <strong>{truckName}</strong> from the map, list, search and its
                  profile page until you unpause. Nothing is deleted. Boost and everything else
                  stay as they are.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOne(!isPaused)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
                isPaused
                  ? "bg-accent text-white hover:bg-accent-dark"
                  : "border border-line bg-card text-ink-soft hover:border-accent/40"
              }`}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPaused ? "Unpause this truck" : "Pause this truck"}
            </button>

            {multi && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setAll(!isPaused)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-ink disabled:opacity-60"
              >
                {isPaused ? "Unpause all my trucks" : "Pause all my trucks"}
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-display text-base font-bold text-ink">Change password</h2>
          <ChangePasswordForm email={ownerEmail} />
        </CardBody>
      </Card>

      <DeleteAccountSection role="truck_owner" />
    </div>
  );
}
