import { connection } from "next/server";
import type { Metadata } from "next";
import "@/site/tokens.css";
import "@/site/base.css";
import { DownloadPage } from "@/site/pages/download-page.tsx";

export const metadata: Metadata = {
  title: "Download · FingerPay",
  description: "Download the FingerPay Customer and Merchant Terminal Android APKs or launch the web simulator.",
};

export default async function DownloadRoute() {
  await connection();
  return <DownloadPage />;
}
