"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useGlass } from "../glass/use-glass.ts";
import { Orb } from "../glass/orb.tsx";
import { Icon } from "../icons.tsx";
import { scrollToTarget } from "../scroll/smooth-scroll.tsx";
import g from "../glass/glass.module.css";
import s from "./nav.module.css";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/numbers", label: "Numbers" },
  { href: "/download", label: "Download" },
  { href: "/contact", label: "Contact" },
] as const;

function goHash(e: MouseEvent<HTMLAnchorElement>, href: string, after?: () => void) {
  if (!href.startsWith("#")) return;
  e.preventDefault();
  after?.();
  if (href === "#top") scrollToTarget(0);
  else scrollToTarget(href);
}

function GlassLink({ href, className, label, children, maxPull }: {
  href: string; className: string; label?: string; children: ReactNode; maxPull?: number;
}) {
  const ref = useGlass<HTMLAnchorElement>(maxPull);
  return (
    <Link ref={ref} href={href} aria-label={label} className={`${g.glass} ${className}`}>
      <span className={g.inner}>{children}</span>
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const pillRef = useGlass<HTMLUListElement>(6);
  const menuRef = useGlass<HTMLButtonElement>(6);
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={s.nav}>
      <nav aria-label="Main" className={s.cluster}>
        <GlassLink href="/" label="FingerPay home" className={s.orbLink} maxPull={10}>
          <Orb />
        </GlassLink>
        <ul ref={pillRef} className={`${g.glass} ${s.pill}`}>
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  data-active={active ? "true" : undefined}
                  className={s.link}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className={s.authGroup}>
          <GlassLink href="/login" className={s.contact}>Sign in</GlassLink>
          <GlassLink href="/signup" className={`${s.contact} ${s.signup}`}>Create an account</GlassLink>
          <button
            ref={menuRef}
            type="button"
            className={`${g.glass} ${s.menuBtn}`}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={g.inner}><Icon name={menuOpen ? "close" : "menu"} /></span>
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className={s.sheetBackdrop}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className={s.sheetPanel}>
            <div className={s.sheetTop}>
              <span className="t-mono-s">FingerPay Navigation</span>
              <button type="button" className={s.sheetClose} onClick={close} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <ul className={s.sheetLinks}>
              <li>
                <Link href="/" data-active={pathname === "/" ? "true" : undefined} onClick={close}>
                  Home
                </Link>
              </li>
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    data-active={pathname === l.href ? "true" : undefined}
                    onClick={close}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className={s.sheetActions}>
              <Link href="/login" className={s.sheetSecondary} onClick={close}>
                Sign in
              </Link>
              <Link href="/signup" className={s.sheetContact} onClick={close}>
                Create an account <Icon name="arrow-right" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function HonestyPill() {
  return (
    <a href="#disclaimer" className={`${g.glass} ${s.honesty} t-caption`} onClick={(e) => goHash(e, "#disclaimer")}>
      Student prototype · integrations simulated
    </a>
  );
}
