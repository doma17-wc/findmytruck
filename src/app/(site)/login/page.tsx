import LoginForm from "@/components/site/LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
        <p className="mt-1 text-sm text-neutral-500">Sign in to save favorites and manage your truck.</p>
        {searchParams.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            That link didn&apos;t work. Please try signing in again.
          </p>
        )}
        <div className="mt-6">
          <LoginForm next={searchParams.next ?? "/account"} />
        </div>
      </div>
    </div>
  );
}
