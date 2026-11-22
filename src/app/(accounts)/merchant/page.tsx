import { AccountApp } from "../account-app";
export const metadata = { title: "Merchant wallet · FingerPay" };
export default async function MerchantPage({ searchParams }: { searchParams: Promise<{ signup?: string }> }) {
  return <AccountApp accountType="merchant" signup={(await searchParams).signup === "1"} />;
}
