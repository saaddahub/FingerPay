"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useGlass } from "../glass/use-glass.ts";
import { Orb } from "../glass/orb.tsx";
import { Icon } from "../icons.tsx";
import { scrollToStage, scrollToTarget } from "../scroll/smooth-scroll.tsx";
import g from "../glass/glass.module.css";
import s from "./nav.module.css";

const LINKS = [
  { href: "#sale", label: "How it works" },
  { href: "#private", label: "Security", stagePart: 0.7 },
  { href: "#fine-print", label: "Numbers" },
  { href: "#download", label: "Download" },
] as const;

function go(e: MouseEvent<HTMLAnchorElement>, href: string, stagePart?: number, after?: () => void) {
  if (!href.startsWith("#")) return;
  e.preventDefault();
  after?.();
  if (href === "#top") scrollToTarget(0);
  else if (stagePart !== undefined) scrollToStage(stagePart, href);
  else scrollToTarget(href);
}

function GlassLink({ href, className, label, children, maxPull, stagePart }: {
  href: string; className: string; label?: string; children: ReactNode; maxPull?: number; stagePart?: number;
}) {
  const ref = useGlass<HTMLAnchorElement>(maxPull);
  return (
    <a ref={ref} href={href} aria-label={label} className={`${g.glass} ${className}`} onClick={(e) => go(e, href, stagePart)}>
      <span className={g.inner}>{children}</span>
    </a>
  );
}

export function Nav() {
  const pillRef = useGlass<HTMLUListElement>(6);
  const menuRef = useGlass<HTMLButtonElement>(6);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <header className={s.nav}>
      <nav aria-label="Main" className={s.cluster}>
        <GlassLink href="#top" label="FingerPay, back to top" className={s.orbLink} maxPull={10}>
          <Orb />
        </GlassLink>
        <ul ref={pillRef} className={`${g.glass} ${s.pill}`}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={s.link} onClick={(e) => go(e, l.href, "stagePart" in l ? l.stagePart : undefined)}>
                {l.label}
              </a>
            </li>
          ))}
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
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={(e) => go(e, l.href, "stagePart" in l ? l.stagePart : undefined, close)}>{l.label}</a>
              </li>
            ))}
            <li><a href="/login">Sign in</a></li>
          </ul>
          <a href="/signup" className={s.sheetContact}>
            Create an account <Icon name="arrow-right" />
          </a>
        </div>
      </dialog>
    </header>
  );
}

export function HonestyPill() {
  return (
    <a href="#disclaimer" className={`${g.glass} ${s.honesty} t-caption`} onClick={(e) => go(e, "#disclaimer")}>
      Student prototype · integrations simulated
    </a>
  );
}
