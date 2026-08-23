import { loginAction } from "../actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-2xl">🚚</span>
          <span className="text-xl font-bold text-neutral-900">
            Find<span className="text-brand">My</span>Truck
          </span>
        </div>
        <h1 className="text-lg font-bold text-neutral-900">Admin sign in</h1>
        <form action={loginAction} className="mt-4 space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base focus:border-brand focus:outline-none"
          />
          {searchParams.error && (
            <p className="text-sm text-red-600">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white active:bg-brand-600"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
