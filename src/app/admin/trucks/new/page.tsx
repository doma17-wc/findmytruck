import Link from "next/link";
import TruckForm from "@/components/admin/TruckForm";

export default function NewTruckPage() {
  return (
    <div className="min-h-dvh bg-neutral-50 pb-12">
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
        <Link href="/admin" className="text-lg">
          ←
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">New truck</h1>
      </header>
      <div className="px-4 py-6">
        <TruckForm />
      </div>
    </div>
  );
}
