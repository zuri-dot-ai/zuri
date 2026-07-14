import type { Metadata } from "next";
import { PricingPageClient } from "./pricing-client";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <PricingPageClient />;
}
