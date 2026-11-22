import { AccountApp } from "../account-app";

export const metadata = { title: "Sign in · FingerPay" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const accountType = (await searchParams).role === "merchant" ? "merchant" : "customer";
  return <AccountApp accountType={accountType} signup={false} entry />;
}
