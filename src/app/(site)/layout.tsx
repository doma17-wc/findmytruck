import Header from "@/components/site/Header";
import BottomNav from "@/components/site/BottomNav";
import Footer from "@/components/site/Footer";
import { getCurrentUserProfile } from "@/lib/supabase/server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const auth = await getCurrentUserProfile();

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-50">
      <Header auth={auth} />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <BottomNav auth={auth} />
    </div>
  );
}
