"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type MouseEvent, type ReactNode } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

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
          <button ref={menuRef} type="button" className={`${g.glass} ${s.menuBtn}`} aria-haspopup="dialog" aria-controls="site-menu"
            onClick={() => dialogRef.current?.showModal()}>
            <span className={g.inner}><Icon name="menu" /></span>
            <span className="visually-hidden">Menu</span>
          </button>
        </div>
      </nav>

      <dialog ref={dialogRef} id="site-menu" className={`${g.glass} ${s.sheet}`} aria-label="Menu"
        onClick={(e) => e.target === e.currentTarget && close()}>
        <div className={s.sheetBody}>
          <button type="button" className={s.sheetClose} onClick={close} autoFocus>
            <Icon name="close" />
            <span className="visually-hidden">Close menu</span>
          </button>
          <ul className={s.sheetLinks}>
            <li>
              <Link href="/" onClick={close}>Home</Link>
            </li>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close}>{l.label}</Link>
              </li>
            ))}
            <li><Link href="/login" onClick={close}>Sign in</Link></li>
          </ul>
          <Link href="/signup" className={s.sheetContact} onClick={close}>
            Create an account <Icon name="arrow-right" />
          </Link>
        </div>
      </dialog>
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
