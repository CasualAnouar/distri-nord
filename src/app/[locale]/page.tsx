import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/dict";
import { Boxes } from "@/components/Boxes";
import { Catalog } from "@/components/Catalog";
import { CartBar } from "@/components/CartBar";
import { Footer } from "@/components/Footer";
import { Hero, HowItWorks, WholesaleBanner } from "@/components/Home";

// Main shop, for individual buyers: by the piece and ready-made boxes.
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className="pb-24">
      <Hero />
      <Boxes />
      <Catalog />
      <WholesaleBanner />
      <HowItWorks />
      <Footer />
      <CartBar />
    </main>
  );
}
