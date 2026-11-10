import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/dict";
import { WholesaleShop } from "@/components/WholesaleShop";

// Secondary shop for big purchases: lots at wholesale prices, with its own minimum.
export default async function WholesalePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <WholesaleShop />;
}
