import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Truck, TruckSchedule, TruckPhoto } from "@/lib/types";
import { getEventsForTruck } from "@/lib/events";
import TruckForm from "@/components/admin/TruckForm";
import AdminMenuBuilder from "@/components/admin/AdminMenuBuilder";
import ScheduleManager from "@/components/admin/ScheduleManager";
import EventsManager from "@/components/admin/EventsManager";
import AdminPhotoGallery from "@/components/admin/AdminPhotoGallery";
import QrPanel from "@/components/admin/QrPanel";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export default async function EditTruckPage({ params }: { params: { id: string } }) {
  const [{ data: truck }, { data: schedules }, { data: photos }, { data: redirect }, events] =
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
      getEventsForTruck(params.id),
    ]);

  if (!truck) notFound();
  const t = truck as Truck;

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="text-lg text-ink-soft">
          ←
        </Link>
        <h1 className="truncate font-display text-lg font-extrabold text-ink">{t.name}</h1>
        <Link
          href={`/trucks/${t.slug}`}
          target="_blank"
          className="ml-auto flex-shrink-0 text-sm font-semibold text-accent"
        >
          View public ↗
        </Link>
      </header>

      <div className="mx-auto max-w-3xl space-y-9 px-4 py-6">
        <Section title="Details">
          <TruckForm truck={t} />
        </Section>
        <Section title="Menu">
          <AdminMenuBuilder truck={t} />
        </Section>
        <Section title="Weekly schedule">
          <ScheduleManager truckId={t.id} schedules={(schedules ?? []) as TruckSchedule[]} />
        </Section>
        <Section title="Events">
          <EventsManager truckId={t.id} events={events} />
        </Section>
        <Section title="Photo gallery">
          <AdminPhotoGallery truckId={t.id} photos={(photos ?? []) as TruckPhoto[]} />
        </Section>
        <Section title="QR code">
          <QrPanel
            truckId={t.id}
            slug={t.slug}
            shortCode={t.short_code}
            scanCount={redirect?.scan_count ?? 0}
          />
        </Section>
      </div>
    </div>
  );
}
