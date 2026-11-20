import { connection } from "next/server";
import "@/site/tokens.css";
import "@/site/base.css";
import { Nav, HonestyPill } from "@/site/nav/nav.tsx";
import { Stage } from "@/site/stage/stage.tsx";
import { Sale } from "@/site/sale/sale.tsx";
import { Ledger } from "@/site/ledger/ledger.tsx";
import { Close, Footer } from "@/site/close/close.tsx";
import { SmoothScroll } from "@/site/scroll/smooth-scroll.tsx";

// The landing page, v4 "Paper & Ink". Spec: DESIGN.md and docs/design/*.md. Hand-built, no Astryx on this
// route (CLAUDE.md, "Marketing page exception").
export default async function Home() {
  await connection(); // the proxy supplies a fresh CSP nonce for each HTML response
  return (
    <>
      <a href="#sale" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main>
        <Stage />
        <Sale />
        <Ledger />
        <Close />
      </main>
      <Footer />
      <HonestyPill />
      <SmoothScroll />
    </>
  );
}
