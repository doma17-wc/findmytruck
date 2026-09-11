import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Page not found</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
        This page doesn&apos;t exist, or the truck may have moved on. Let&apos;s get you back on track.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
      >
        Back to the map
      </Link>
    </div>
  );
}
