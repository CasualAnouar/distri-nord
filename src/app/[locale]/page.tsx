import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/dict";
import { Catalog } from "@/components/Catalog";
import { CartBar } from "@/components/CartBar";
import { Footer } from "@/components/Footer";
import { Hero, HowItWorks } from "@/components/Home";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main className="pb-24">
      <Hero />
      <Catalog />
      <HowItWorks />
      <Footer />
      <CartBar />
    </main>
  );
}
