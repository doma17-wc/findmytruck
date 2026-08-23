import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Truck, TruckSchedule, TruckPhoto } from "@/lib/types";
import TruckForm from "@/components/admin/TruckForm";
import ScheduleManager from "@/components/admin/ScheduleManager";
import PhotoUploader from "@/components/admin/PhotoUploader";
import QrPanel from "@/components/admin/QrPanel";

export const dynamic = "force-dynamic";

export default async function EditTruckPage({ params }: { params: { id: string } }) {
  const [{ data: truck }, { data: schedules }, { data: photos }, { data: redirect }] =
    await Promise.all([
      supabase.from("trucks").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("truck_schedules")
        .select("*")
        .eq("truck_id", params.id)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("truck_photos")
        .select("*")
        .eq("truck_id", params.id)
        .order("sort_order", { ascending: true }),
      supabase.from("qr_redirects").select("*").eq("truck_id", params.id).maybeSingle(),
    ]);

  if (!truck) notFound();

  const t = truck as Truck;

  return (
    <div className="min-h-dvh bg-neutral-50 pb-16">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <Link href="/admin" className="text-lg">
          ←
        </Link>
        <h1 className="truncate text-lg font-bold text-neutral-900">{t.name}</h1>
        <Link
          href={`/trucks/${t.slug}`}
          target="_blank"
          className="ml-auto text-sm font-semibold text-brand"
        >
          View public page ↗
        </Link>
      </header>

      <div className="space-y-8 px-4 py-6">
        <section>
          <h2 className="mb-3 text-base font-bold text-neutral-900">Details</h2>
          <TruckForm truck={t} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-neutral-900">Weekly schedule</h2>
          <ScheduleManager truckId={t.id} schedules={(schedules ?? []) as TruckSchedule[]} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-neutral-900">Photo gallery</h2>
          <PhotoUploader truckId={t.id} photos={(photos ?? []) as TruckPhoto[]} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-neutral-900">QR code</h2>
          <QrPanel
            truckId={t.id}
            slug={t.slug}
            shortCode={t.short_code}
            scanCount={redirect?.scan_count ?? 0}
          />
        </section>
      </div>
    </div>
  );
}
