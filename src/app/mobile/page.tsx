import type { Metadata } from "next";
import { connection } from "next/server";
import { Theme } from "@astryxdesign/core/theme";
import { themes } from "../../astryx-themes";
import { Wallet } from "./wallet";
import Link from "next/link";

export const metadata: Metadata = { title: "FingerPay · Mobile prototype" };

export default async function MobilePage() {
  await connection(); // The request supplies the nonce used by the app's CSP.
  // Dark mode keeps the Astryx sheets and buttons in step with the wallet's own dark glass.
  return (
    <Theme theme={themes.fingerpay} mode="dark">
      <nav aria-label="FingerPay accounts" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 24, padding: 16, background: "#0a0a0b", color: "#f5f5f7" }}>
        <Link href="/signup">Create an account</Link>
        <Link href="/customer">Customer wallet</Link>
        <Link href="/merchant">Merchant wallet</Link>
      </nav>
      <Wallet />
    </Theme>
  );
}
