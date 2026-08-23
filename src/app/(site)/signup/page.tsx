import SignupForm from "@/components/site/SignupForm";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold text-neutral-900">Create your account</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Browsing trucks never requires an account — sign up to save favorites.
        </p>
        <div className="mt-6">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
