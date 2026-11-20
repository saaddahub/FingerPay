import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// Root layout stays bare: the landing page (/) brings its own tokens (src/site), the product routes bring
// Astryx in their own layouts (CLAUDE.md, "Marketing page exception").
export const metadata: Metadata = {
  title: "FingerPay: pay with nothing",
  description:
    "FingerPay is a student prototype of thumb payments for Pakistani shops. No phone, card or cash at the counter, settled in under three seconds. All integrations are simulated.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
