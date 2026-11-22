import { connection } from "next/server";
import type { Metadata } from "next";
import "@/site/tokens.css";
import "@/site/base.css";
import { SecurityPage } from "@/site/pages/security-page.tsx";

export const metadata: Metadata = {
  title: "Security · FingerPay",
  description: "Zero fingerprint images stored, keyed HMAC blind indexes, AES-256-GCM envelope encryption, and SMS Thumb Lock.",
};

export default async function SecurityRoute() {
  await connection();
  return <SecurityPage />;
}
