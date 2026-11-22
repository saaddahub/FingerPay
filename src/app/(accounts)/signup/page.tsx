import { AccountApp } from "../account-app";

export const metadata = { title: "Create your account · FingerPay" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const accountType = (await searchParams).role === "merchant" ? "merchant" : "customer";
  return <AccountApp accountType={accountType} signup entry />;
}
