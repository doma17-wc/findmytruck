import Link from "next/link";
import TruckForm from "@/components/admin/TruckForm";

export default function NewTruckPage() {
  return (
    <div className="pb-20">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="text-lg text-ink-soft">
          ←
        </Link>
        <h1 className="font-display text-lg font-extrabold text-ink">New truck</h1>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <TruckForm />
      </div>
    </div>
  );
}
