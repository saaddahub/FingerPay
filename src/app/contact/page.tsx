import { connection } from "next/server";
import type { Metadata } from "next";
import "@/site/tokens.css";
import "@/site/base.css";
import { ContactPage } from "@/site/pages/contact-page.tsx";

export const metadata: Metadata = {
  title: "Contact & Review · FingerPay",
  description: "Contact the FingerPay team, leave a prototype review, and receive the project brief by email via Resend.",
};

export default async function ContactRoute() {
  await connection();
  return <ContactPage />;
}
