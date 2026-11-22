import { AccountApp } from "../account-app";
export const metadata = { title: "Customer wallet · FingerPay" };
export default async function CustomerPage({ searchParams }: { searchParams: Promise<{ signup?: string }> }) {
  return <AccountApp accountType="customer" signup={(await searchParams).signup === "1"} />;
}
