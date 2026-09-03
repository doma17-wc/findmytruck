import { loginAction } from "../actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-2xl">🚚</span>
          <span className="text-xl font-bold text-ink">
            Find<span className="text-accent">My</span>Truck
          </span>
        </div>
        <h1 className="text-lg font-bold text-ink">Admin sign in</h1>
        <form action={loginAction} className="mt-4 space-y-3">
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            autoFocus
            className="w-full rounded-xl border border-line px-4 py-3 text-base focus:border-accent focus:outline-none"
          />
          {searchParams.error && (
            <p className="text-sm text-accent-dark">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-accent py-3 text-base font-bold text-white hover:bg-accent-dark"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
