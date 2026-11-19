import { DISCLAIMER } from '@fingerpay/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'FingerPay — Developer Test Console',
  description: 'Security-first backend test console for FingerPay views A–E',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="shell">
          <header className="topbar">
            <div className="brand">FingerPay Test Console</div>
            <nav className="nav" aria-label="Console views">
              <Link href="/">System</Link>
              <Link href="/login">Auth</Link>
              <Link href="/pos">View A: POS</Link>
              <Link href="/merchant">View B: Ledger</Link>
              <Link href="/branch">View C: Branch</Link>
              <Link href="/sms">View D: SMS &amp; Disputes</Link>
              <Link href="/bank">View E: Bank Console</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
          <footer className="footer">{DISCLAIMER}</footer>
        </div>
      </body>
    </html>
  );
}
