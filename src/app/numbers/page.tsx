import { connection } from "next/server";
import type { Metadata } from "next";
import "@/site/tokens.css";
import "@/site/base.css";
import { NumbersPage } from "@/site/pages/numbers-page.tsx";

export const metadata: Metadata = {
  title: "Numbers & Economics · FingerPay",
  description: "Interactive MDR fee calculator, per-tap limits, student cashback, and prototype rules.",
};

export default async function NumbersRoute() {
  await connection();
  return <NumbersPage />;
}
