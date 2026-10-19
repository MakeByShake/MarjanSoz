import { AuthGuard } from "@/components/AuthGuard";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded bg-gold px-4 py-2 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Негізгі мазмұнға өту
      </a>
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AuthGuard>{children}</AuthGuard>
      </main>
      <Footer />
    </>
  );
}
