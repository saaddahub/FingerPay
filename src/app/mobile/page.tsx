import type { Metadata } from "next";
import { connection } from "next/server";
import { Theme } from "@astryxdesign/core/theme";
import { themes } from "../../astryx-themes";
import { Wallet } from "./wallet";

export const metadata: Metadata = { title: "FingerPay · Mobile prototype" };

export default async function MobilePage() {
  await connection(); // The request supplies the nonce used by the app's CSP.
  // Dark mode keeps the Astryx sheets and buttons in step with the wallet's own dark glass.
  return (
    <Theme theme={themes.fingerpay} mode="dark">
      <Wallet />
    </Theme>
  );
}
