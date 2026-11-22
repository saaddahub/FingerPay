import { connection } from "next/server";
import type { Metadata } from "next";
import "@/site/tokens.css";
import "@/site/base.css";
import { HowItWorksPage } from "@/site/pages/how-it-works-page.tsx";

export const metadata: Metadata = {
  title: "How it works · FingerPay",
  description: "From one-time Allied Bank branch enrollment to under-3-second counter settlement and plain-SMS receipts.",
};

export default async function HowItWorksRoute() {
  await connection();
  return <HowItWorksPage />;
}
