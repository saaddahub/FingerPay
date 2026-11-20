"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { BottomSheet } from "@astryxdesign/core/BottomSheet";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import styles from "./wallet.module.css";

// Rasheed's FingerPay shop terminal, in the original wallet design (glass, holographic stack, round glass buttons).
// Demo prototype: not connected to the backend. Sales, fees and the ledger are demo data held here; the real terminal
// shows what the server returns. Original wallet: docs/design/archive/wallet-v1/.

const glyphs = {
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z",
  eyeOff: "m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9 6.4A11 11 0 0 1 12 6c6.4 0 10 6 10 6a13 13 0 0 1-2.2 2.6M6.2 7.6A15 15 0 0 0 2 12s3.6 6 10 6a10 10 0 0 0 4.4-1",
  send: "M6 18 18 6M7 6h11v11",
  request: "M18 6 6 18M6 7v11h11",
  plus: "M12 5v14M5 12h14",
  thumb: "M12 3a6 6 0 0 1 6 6v4M6 13V9a6 6 0 0 1 3-5.2M9 21v-8a3 3 0 0 1 6 0v3M12 13v8M15 19v2",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6",
  export: "M12 4v11m0 0-4-4m4 4 4-4M5 19h14",
  more: "M6 12h.01M12 12h.01M18 12h.01",
  home: "m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10",
  sell: "M5 4h14v16H5zM8 8h8M8 12h2m2 0h2m2 0h0M8 16h2m2 0h2",
  activity: "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h8m-8 4h8m-8 4h5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-3 2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.8a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4L4.7 12l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.8h5l.4-2.8a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4Z",
  contactless: "M6 9c1.8 1.5 1.8 4.5 0 6m4-8c2.9 2.7 2.9 7.3 0 10m4-12c4 3.8 4 10.2 0 14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  cross: "M6 6l12 12M18 6 6 18",
  back: "M15 6l-6 6 6 6M9 12h11",
  swap: "M7 7h11l-3-3M17 17H6l3 3",
  undo: "M9 7 5 11l4 4M5 11h9a5 5 0 0 1 0 10h-2",
} as const;

function Glyph({ name }: { name: keyof typeof glyphs }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={glyphs[name]} />
    </svg>
  );
}

// The FingerPay arches (brand mark) as the charge gauge: drains while waiting, sweeps while checking.
const ARCHES = ["M-59 125V0A59 59 0 0 1 59 0V73", "M-118 86V0A118 118 0 0 1 118 0V152", "M-177 47V0A177 177 0 0 1 177 0V99", "M-200.14 -125.06A236 236 0 0 1 200.14 -125.06", "M0 -7V139"];
function Arches({ state }: { state: "waiting" | "checking" | "settled" | "declined" | "mark" }) {
  return (
    <svg className={styles.arches} data-state={state} viewBox="-214.13 -252.5 428.26 404.5" aria-hidden="true" focusable="false">
      <g>{ARCHES.map((d, i) => <path key={i} d={d} pathLength={1} data-arch={i} />)}</g>
      <g className={styles.archSweep}>{ARCHES.map((d, i) => <path key={i} d={d} pathLength={1} />)}</g>
    </svg>
  );
}

// ---- money: exact paisa as bigint, formatted as strings ----
const PKR = (rupees: number | string) => BigInt(rupees) * 100n;
function money(paisa: bigint) {
  const amount = paisa < 0n ? -paisa : paisa;
  return { whole: (amount / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","), cents: (amount % 100n).toString().padStart(2, "0") };
}
const fmt = (p: bigint) => { const m = money(p); return `${m.whole}.${m.cents}`; };
// shortcut: demo-only fee (0.45% above PKR 100, half-up, capped at PKR 25); the real terminal shows the database's fee.
const demoFee = (g: bigint) => { if (g <= PKR(100)) return 0n; const f = (g * 45n + 5000n) / 10000n; return f > PKR(25) ? PKR(25) : f; };
const cardFee = (g: bigint) => (g * 25n + 500n) / 1000n;

type Status = "settled" | "declined" | "reversed" | "offline";
type Sale = { id: number; time: string; shopper: string | null; gross: bigint; status: Status; ref: string };
type Phase = "waiting" | "checking" | "settled" | "declined" | "cash";
type Decline = { head: string; detail: string; next: string; locked?: boolean };

const SEED: Sale[] = [
  { id: 8, time: "19:42", shopper: "Ayesha K.", gross: PKR(180), status: "settled", ref: "…8F21C0" },
  { id: 7, time: "19:40", shopper: null, gross: PKR(500), status: "declined", ref: "—" },
  { id: 6, time: "19:31", shopper: "Bilal H.", gross: PKR(180), status: "settled", ref: "…3A90D4" },
  { id: 5, time: "18:05", shopper: null, gross: PKR(260), status: "offline", ref: "—" },
  { id: 4, time: "17:12", shopper: "Ayesha K.", gross: PKR(1800), status: "reversed", ref: "…71BE02" },
  { id: 3, time: "16:20", shopper: "Bilal H.", gross: PKR(90), status: "settled", ref: "…C40E19" },
  { id: 2, time: "14:05", shopper: "Ayesha K.", gross: PKR(640), status: "settled", ref: "…0D5A77" },
  { id: 1, time: "11:30", shopper: "Bilal H.", gross: PKR(150), status: "settled", ref: "…9B2F61" },
];
const STATUS_LABEL: Record<Status, string> = { settled: "Settled", declined: "Declined · PKR 0 fee", reversed: "Voided", offline: "Cash · offline" };
const STATUS_GLYPH: Record<Status, keyof typeof glyphs> = { settled: "request", declined: "cross", reversed: "undo", offline: "swap" };

const cards = {
  today: { name: "Today" },
  bank: { name: "Allied Bank" },
  month: { name: "This month" },
} as const;
type CardId = keyof typeof cards;

const tabs = ["Home", "Sell", "Activity", "Settings"] as const;
const tabGlyphs = ["home", "sell", "activity", "settings"] as const;
type Tab = typeof tabs[number];
const actions = ["Charge", "Refresh", "Export", "More"] as const;
const actionGlyphs = ["thumb", "refresh", "export", "more"] as const;
const PRESETS = [80, 150, 180, 500];
const EXPIRY_S = 120;
const spring = { type: "spring", duration: 0.44, bounce: 0.16 } as const;

function ActivityRows({ rows, onOpen }: { rows: Sale[]; onOpen: (s: Sale) => void }) {
  return (
    <ul className={styles.rows}>
      {rows.map((row) => {
        const { whole, cents } = money(row.gross);
        return (
          <li key={row.id}>
            <button type="button" className={styles.row} data-status={row.status} onClick={() => onOpen(row)}>
              <span className={styles.rowIcon} data-credit={row.status === "settled"}><Glyph name={STATUS_GLYPH[row.status]} /></span>
              <span className={styles.rowCopy}><strong>{row.shopper ?? "Name not shown"}</strong><small>{row.time} · {STATUS_LABEL[row.status]}</small></span>
              <span className={styles.rowAmount}>{row.status === "settled" ? "+" : ""}PKR {whole}.{cents}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Wallet() {
  const [order, setOrder] = useState<CardId[]>(["today", "bank", "month"]);
  const [flipped, setFlipped] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [tab, setTab] = useState<Tab>("Home");
  const [sheet, setSheet] = useState<"More" | "Notifications" | null>(null);
  const [notice, setNotice] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [sales, setSales] = useState<Sale[]>(SEED);
  const [entry, setEntry] = useState("180");
  const [phase, setPhase] = useState<Phase | null>(null);
  const [tries, setTries] = useState(0);
  const [left, setLeft] = useState(EXPIRY_S);
  const [decline, setDecline] = useState<Decline | null>(null);
  const [paidBy, setPaidBy] = useState("");
  const [offline, setOffline] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState<string | null>(null);
  const [updated, setUpdated] = useState("19:44");
  const scroll = useRef<HTMLElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const reducedMotion = useReducedMotion();
  const active = order[0];
  const amount = entry ? PKR(entry) : 0n;

  const totals = useMemo(() => {
    const settled = sales.filter((s) => s.status === "settled");
    const gross = settled.reduce((a, s) => a + s.gross, 0n);
    const fees = settled.reduce((a, s) => a + demoFee(s.gross), 0n);
    const saved = settled.reduce((a, s) => a + cardFee(s.gross) - demoFee(s.gross), 0n);
    return { count: settled.length, gross, fees, net: gross - fees, saved, bank: PKR(14000) + gross - fees, month: 137 + settled.length };
  }, [sales]);
  const net = money(totals.net);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = window.setTimeout(() => setToastVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [notice, toastVisible]);

  // the open charge expires after 120 s
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = window.setTimeout(() => {
      if (left > 1) { setLeft(left - 1); return; }
      setLeft(0);
      setDecline({ head: "START A NEW SALE", detail: "No thumb within 2 minutes.", next: "", locked: true });
      setPhase("declined");
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, left]);
  useEffect(() => { if (phase && phase !== "checking") primary.current?.focus({ preventScroll: true }); }, [phase]);

  function announce(message: string) { setNotice(message); setToastVisible(true); }
  function navigate(next: Tab) { setTab(next); scroll.current?.scrollTo({ top: 0 }); }
  function selectCard(id: CardId) { setOrder((current) => [id, ...current.filter((card) => card !== id)]); setFlipped(false); }
  const now = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const nextId = () => (sales[0]?.id ?? 0) + 1;

  // ---- Sell ----
  function press(key: string) {
    setEntry((cur) => (key === "clear" ? "" : key === "back" ? cur.slice(0, -1) : cur.length >= 6 ? cur : (cur + key).replace(/^0+/, "")));
  }
  function charge() {
    if (!amount) { navigate("Sell"); return; }
    setTries(0); setLeft(EXPIRY_S); setDecline(null);
    setPhase(offline ? "cash" : "waiting");
  }
  function newSale(first = "") { setPhase(null); setDecline(null); setEntry(first); }

  useEffect(() => {
    // hardware keypad: 0-9, Backspace, Escape = clear, Enter = charge or new sale
    const onKey = (e: KeyboardEvent) => {
      if (detail || sheet) return;
      if (phase === "settled" || phase === "declined") { if (e.key === "Enter") { e.preventDefault(); newSale(); } return; }
      if (phase || tab !== "Sell") return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Escape") press("clear");
      else if (e.key === "Enter") charge();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // demo scanner: three thumbs stand in for the hardware
  function tap(who: "ayesha" | "bilal" | "unknown") {
    setPhase("checking");
    window.setTimeout(() => {
      const limit = who === "ayesha" ? PKR(5000) : PKR(2000);
      let result: Decline | null = null;
      if (who === "unknown") result = { head: "THUMB NOT RECOGNIZED", detail: "ENROL AT ALLIED BANK BRANCH", next: "Ask the shopper to try again." };
      else if (amount > limit) result = { head: "PAYMENT DECLINED", detail: "ABOVE THUMB-PAY LIMIT (PKR 0 FEE CHARGED)", next: "Ask for another way to pay." };
      else if (who === "bilal" && amount > PKR(270)) result = { head: "PAYMENT DECLINED", detail: "INSUFFICIENT BALANCE (PKR 0 FEE CHARGED)", next: "Ask for another way to pay." };
      if (result) {
        const used = tries + 1;
        setTries(used);
        if (used >= 3) result = { head: "START A NEW SALE", detail: "3 thumbs didn't match this sale.", next: "", locked: true };
        setSales((r) => [{ id: nextId(), time: now(), shopper: null, gross: amount, status: "declined", ref: "—" }, ...r]);
        setDecline(result); setPhase("declined");
        navigator.vibrate?.([10, 60, 10]);
        return;
      }
      const name = who === "ayesha" ? "Ayesha K." : "Bilal H.";
      setPaidBy(name);
      setSales((r) => [{ id: nextId(), time: now(), shopper: name, gross: amount, status: "settled", ref: `…${Math.random().toString(16).slice(2, 8).toUpperCase()}` }, ...r]);
      setPhase("settled");
      navigator.vibrate?.(12);
    }, reducedMotion ? 200 : 1100);
  }

  function runAction(action: typeof actions[number]) {
    if (action === "Charge") { if (tab === "Sell") charge(); else navigate("Sell"); }
    if (action === "Refresh") { setUpdated(now()); announce("Today's figures refreshed."); }
    if (action === "Export") announce("Demo: the server builds today's CSV for the accountant.");
    if (action === "More") setSheet("More");
  }

  const cardFigures: Record<CardId, { label: string; value: string; unit?: string; back: [string, string][] }> = {
    today: { label: "Net settled", value: hidden ? "••••••" : fmt(totals.net), unit: "PKR", back: [["Gross", `PKR ${fmt(totals.gross)}`], ["Fees", `PKR ${fmt(totals.fees)}`], ["Saved vs 2.5% card", `PKR ${fmt(totals.saved)}`]] },
    bank: { label: "Balance (simulated)", value: hidden ? "••••••" : fmt(totals.bank), unit: "PKR", back: [["Settles over", "Raast (simulated)"], ["Account", "Rasheed Kiryana Store"]] },
    month: { label: "Settled sales", value: String(totals.month), back: [["Screenshots avoided", String(totals.month)], ["Today", `${totals.count} sales`]] },
  };

  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, "0");
  const big = money(amount);

  return (
    <MotionConfig reducedMotion="user">
      <main className={styles.stage}>
        <section className={styles.device} aria-label="FingerPay shop terminal prototype">
          <section className={styles.scroll} ref={scroll} aria-label={`${tab} screen`}>
            <header className={styles.header}>
              <button className={styles.avatar} type="button" onClick={() => navigate("Settings")} aria-label="Open Rasheed's settings">RA</button>
              <section className={styles.greeting}>
                <Text color="inherit" className={styles.greetingLabel}>{offline ? "Offline · take cash" : "Online · Rasheed Kiryana"}</Text>
                <Heading color="inherit" level={1} className={styles.name}>Rasheed</Heading>
              </section>
              <button type="button" className={styles.bell} aria-label="Notifications" onClick={() => setSheet("Notifications")}><Glyph name="bell" /></button>
            </header>

            <section className={styles.noticeArea} aria-live="polite" aria-atomic="true">
              <AnimatePresence initial={false}>
                {toastVisible && (
                  <motion.p className={styles.notice} key={notice} initial={{ opacity: 0, y: -7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Glyph name="activity" />{notice}
                  </motion.p>
                )}
              </AnimatePresence>
            </section>

            {tab === "Home" && (
              <>
                <section className={styles.balance} aria-label="Net settled today">
                  <section className={styles.balanceLabel}>
                    <Text color="inherit">Net settled today</Text>
                    <button type="button" className={styles.eye} onClick={() => setHidden(!hidden)} aria-label={hidden ? "Show figures" : "Hide figures"}>
                      <Glyph name={hidden ? "eyeOff" : "eye"} />
                    </button>
                  </section>
                  <p className={styles.amount} aria-label={hidden ? "Figure hidden" : `PKR ${net.whole}.${net.cents}`}>
                    {hidden ? "••••••" : <><span className={styles.currency}>PKR</span>{net.whole}<small>.{net.cents}</small></>}
                  </p>
                  <p className={styles.delta}>{hidden ? "Today's sales hidden" : <><Glyph name="send" /><strong>{totals.count} sales</strong> · {totals.count} screenshots avoided · updated {updated}</>}</p>
                </section>

                {/* the holographic stack: Today, Allied Bank, This month. Swipe or tap; tap the front card to flip */}
                <section className={styles.deck} aria-label="Today's figures">
                  {(Object.keys(cards) as CardId[]).map((id) => {
                    const slot = 2 - order.indexOf(id);
                    const front = id === active;
                    const isFlipped = front && flipped;
                    const fig = cardFigures[id];
                    return (
                      <motion.button
                        key={id}
                        type="button"
                        initial={false}
                        layout={reducedMotion ? false : "position"}
                        data-card={id}
                        data-slot={slot}
                        data-flipped={isFlipped}
                        aria-label={front ? (isFlipped ? `Show front of ${cards[id].name}` : `Show ${cards[id].name} details`) : `Show ${cards[id].name}: ${fig.label} ${fig.unit ?? ""} ${fig.value}`}
                        aria-describedby={isFlipped ? `wallet-card-details-${id}` : undefined}
                        className={styles.card}
                        transition={spring}
                        drag={front ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={reducedMotion ? 0 : 0.32}
                        dragMomentum={false}
                        onDragStart={() => { dragging.current = true; }}
                        onDragEnd={(_, { offset, velocity }) => {
                          if (Math.abs(offset.x) > 36 || Math.abs(velocity.x) > 420) selectCard(order[offset.x < 0 ? 1 : 2]);
                          requestAnimationFrame(() => { dragging.current = false; });
                        }}
                        onClick={() => { if (dragging.current) return; if (front) setFlipped(!flipped); else selectCard(id); }}
                      >
                        <span className={styles.flipper}>
                          <span className={styles.cardFace} aria-hidden="true">
                            <span className={styles.sheen} />
                            <span className={styles.cardHeader}>
                              <Image src="/brand/fingerpay-wordmark.svg" alt="" width={93} height={21} className={styles.wordmark} loading="eager" draggable={false} />
                              <span className={styles.cardName}>{cards[id].name}</span>
                              <span className={styles.edgeFigure}>{fig.unit ? `${fig.unit} ` : ""}{fig.value}</span>
                            </span>
                            <span className={styles.cardMark}><Arches state="mark" /></span>
                            <span className={styles.cardFooter}>
                              <span><strong>{fig.unit && <small className={styles.cardUnit}>{fig.unit} </small>}{fig.value}</strong><small>{fig.label}</small></span>
                              <Glyph name="contactless" />
                            </span>
                          </span>
                          <span className={styles.cardBack} aria-hidden={!isFlipped}>
                            <span className={styles.strip} />
                            <span className={styles.cardDetails} id={`wallet-card-details-${id}`}>
                              {fig.back.map(([k, v]) => <span key={k}>{k} <strong>{v}</strong></span>)}
                            </span>
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </section>
              </>
            )}

            {tab !== "Home" && <Heading level={2} color="inherit" className={styles.screenTitle}>{tab === "Sell" ? "New sale" : tab}</Heading>}

            {tab === "Sell" && (
              <section className={styles.sell} aria-label="New sale">
                <p className={styles.entry} aria-live="polite"><span className={styles.currency}>PKR</span><span data-empty={!entry}>{entry ? big.whole : "0"}</span></p>
                <nav className={styles.presets} aria-label="Preset amounts">
                  {PRESETS.map((p) => <button key={p} type="button" aria-pressed={entry === String(p)} onClick={() => setEntry(String(p))}>PKR {p}</button>)}
                </nav>
                <section className={styles.keypad} aria-label="Keypad">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => <button key={k} type="button" onClick={() => press(k)}>{k}</button>)}
                  <button type="button" className={styles.keyQuiet} onClick={() => press("clear")}>Clear</button>
                  <button type="button" onClick={() => press("0")}>0</button>
                  <button type="button" className={styles.keyQuiet} onClick={() => press("back")} aria-label="Delete last digit"><Glyph name="back" /></button>
                </section>
                <button type="button" className={styles.chargeButton} data-cash={offline} aria-disabled={!amount} onClick={charge}>
                  {amount ? `${offline ? "Take cash" : "Charge"} PKR ${big.whole}` : "Enter an amount"}
                </button>
              </section>
            )}

            {(tab === "Home" || tab === "Activity") && (
              <>
                {tab === "Home" && (
                  <section className={styles.actions} aria-label="Shop actions">
                    {actions.map((action, index) => (
                      <button type="button" className={styles.action} key={action} onClick={() => runAction(action)}>
                        <span className={styles.actionIcon} data-primary={index === 0}><Glyph name={actionGlyphs[index]} /></span>
                        {action}
                      </button>
                    ))}
                  </section>
                )}
                <section className={styles.activity} aria-label="Today's sales">
                  {tab === "Home" && (
                    <header className={styles.activityHeader}>
                      <Heading level={2} color="inherit" className={styles.sectionTitle}>Today&apos;s sales</Heading>
                      <button type="button" className={styles.textButton} onClick={() => navigate("Activity")}>See all</button>
                    </header>
                  )}
                  <ActivityRows rows={tab === "Home" ? sales.slice(0, 3) : sales} onOpen={(s) => { setDetail(s); setVoidReason(null); }} />
                </section>
              </>
            )}

            {tab === "Settings" && (
              <section className={styles.panel}>
                <Heading level={3} color="inherit" className={styles.sectionTitle}>Rasheed Ahmed · Owner</Heading>
                <Text color="inherit" className={styles.panelText}>Rasheed Kiryana Store · terminal ••7F3A</Text>
                <button type="button" className={styles.switchRow} aria-pressed={offline} onClick={() => { setOffline(!offline); announce(offline ? "Back online." : "Offline. Sales now show TAKE CASH."); }}>
                  <span>Simulate no internet<small>Demo only: shows TAKE CASH</small></span><span className={styles.switch} />
                </button>
                <Text color="inherit" className={styles.panelText}>FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.</Text>
                <Button label={hidden ? "Show figures" : "Hide figures"} variant="secondary" onClick={() => setHidden(!hidden)} />
              </section>
            )}
          </section>

          <nav className={styles.dock} aria-label="Terminal navigation">
            {tabs.map((name, index) => (
              <button type="button" key={name} aria-current={tab === name ? "page" : undefined} onClick={() => navigate(name)}>
                {tab === name && <motion.span layoutId="active-wallet-tab" className={styles.activeTab} transition={spring} aria-hidden="true" />}
                <Glyph name={tabGlyphs[index]} />{name}
              </button>
            ))}
          </nav>

          {/* the charge flow: full screen over the tabs */}
          <AnimatePresence>
            {phase && (
              <motion.section key="flow" className={styles.flow} data-phase={phase} role="dialog" aria-modal="true" aria-label="Sale in progress"
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={spring}>
                {(phase === "waiting" || phase === "checking") && (
                  <>
                    <button type="button" className={styles.flowCancel} data-hidden={phase === "checking"} disabled={phase === "checking"} onClick={() => newSale(entry)}><Glyph name="cross" />Cancel</button>
                    <p className={styles.flowAmount}><span className={styles.currency}>PKR</span>{big.whole}</p>
                    <Arches state={phase} />
                    {phase === "waiting" ? (
                      <>
                        <p className={styles.flowLine}>Shopper: place thumb on the FingerPay scanner</p>
                        <p className={styles.flowMeta}>{mm}:{ss} left</p>
                        <section className={styles.demoTray} aria-label="Demo scanner">
                          <span>Demo scanner · tap a thumb</span>
                          <button type="button" onClick={() => tap("ayesha")}>Ayesha</button>
                          <button type="button" onClick={() => tap("bilal")}>Bilal</button>
                          <button type="button" onClick={() => tap("unknown")}>Unknown</button>
                        </section>
                        <button ref={primary} type="button" className={styles.ghostButton} onClick={() => newSale(entry)}>Cancel sale</button>
                      </>
                    ) : (
                      <>
                        <p className={styles.flowLine} aria-busy="true">Checking…</p>
                        <p className={styles.flowMeta}>Risk Engine</p>
                      </>
                    )}
                  </>
                )}

                {phase === "settled" && (
                  <>
                    <section className={styles.verdict} data-kind="settled">
                      <span className={styles.sheen} />
                      <p className={styles.verdictHead}><Glyph name="check" />PAYMENT SUCCESSFUL</p>
                      <p className={styles.verdictAmount}><span className={styles.currency}>PKR</span>{big.whole} <span>RECEIVED</span></p>
                      <Arches state="settled" />
                    </section>
                    <dl className={styles.receipt}>
                      <dt>Paid by</dt><dd>{paidBy}</dd>
                      <dt>Net to Allied Bank</dt><dd>PKR {fmt(amount - demoFee(amount))}</dd>
                      <dt>Fee</dt><dd>PKR {fmt(demoFee(amount))}</dd>
                      <dt>Raast ref (simulated)</dt><dd>{sales[0]?.ref}</dd>
                    </dl>
                    <button ref={primary} type="button" className={styles.chargeButton} onClick={() => newSale()}>New sale</button>
                  </>
                )}

                {phase === "declined" && decline && (
                  <>
                    <section className={styles.verdict} data-kind="declined">
                      <span className={styles.sheen} />
                      <p className={styles.verdictHead}><Glyph name="cross" />{decline.head}</p>
                      <p className={styles.verdictDetail}>{decline.detail}</p>
                      <p className={styles.verdictNote}>PKR {big.whole} not charged</p>
                      <Arches state="declined" />
                    </section>
                    {decline.next && <p className={styles.flowLine}>{decline.next}</p>}
                    {!decline.locked && tries < 3 && <button ref={primary} type="button" className={styles.chargeButton} onClick={() => { setPhase("waiting"); setDecline(null); }}>Try thumb again ({3 - tries} left)</button>}
                    <button ref={decline.locked ? primary : undefined} type="button" className={decline.locked ? styles.chargeButton : styles.ghostButton} onClick={() => newSale()}>New sale</button>
                  </>
                )}

                {phase === "cash" && (
                  <>
                    <section className={styles.verdict} data-kind="cash">
                      <p className={styles.verdictDetail}>INTERNET DOWN</p>
                      <p className={styles.cashBig}>TAKE CASH IMMEDIATELY</p>
                      <p className={styles.verdictDetail}>PKR {big.whole} (SALE NOT CHARGED)</p>
                    </section>
                    <p className={styles.flowMeta}>Waiting for internet…</p>
                    <button ref={primary} type="button" className={styles.chargeButton} onClick={() => { setSales((r) => [{ id: nextId(), time: now(), shopper: null, gross: amount, status: "offline", ref: "—" }, ...r]); newSale(); announce("Cash sale noted in Today."); }}>Cash taken · Done</button>
                  </>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          <BottomSheet isOpen={sheet !== null} onOpenChange={(open) => { if (!open) setSheet(null); }} label={sheet ?? "Terminal"} height="hug" className={styles.sheet}>
            <VStack gap={3}>
              <Heading level={2} color="inherit">{sheet === "More" ? "Owner tools" : "Notifications"}</Heading>
              <Text color="inherit">{sheet === "More" ? "Void a sale from its row in Today's sales, export the day's CSV, or simulate no internet in Settings." : notice || "No new notifications."}</Text>
              <Button label="Close" variant="secondary" onClick={() => setSheet(null)} />
            </VStack>
          </BottomSheet>

          {/* sale detail and same-day void */}
          <BottomSheet isOpen={detail !== null} onOpenChange={(o) => { if (!o) { setDetail(null); setVoidReason(null); } }} label="Sale detail" height="hug" className={styles.sheet}>
            {detail && (
              <VStack gap={3}>
                <Heading level={2} color="inherit">{STATUS_LABEL[detail.status]} · {detail.time}</Heading>
                <dl className={styles.receipt}>
                  <dt>Shopper</dt><dd>{detail.shopper ?? "Not shown (privacy)"}</dd>
                  <dt>Gross</dt><dd>PKR {fmt(detail.gross)}</dd>
                  {detail.status === "settled" && <><dt>Fee</dt><dd>PKR {fmt(demoFee(detail.gross))}</dd><dt>Net to Allied Bank</dt><dd>PKR {fmt(detail.gross - demoFee(detail.gross))}</dd></>}
                  <dt>Raast ref (simulated)</dt><dd>{detail.ref}</dd>
                </dl>
                {detail.status === "settled" && (voidReason === null
                  ? <Button label="Void this sale" variant="secondary" onClick={() => setVoidReason("")} />
                  : (
                    <section className={styles.reasons} aria-label="Why are you voiding it?">
                      <Text color="inherit">Why are you voiding it?</Text>
                      {["Wrong amount typed", "Shopper returned items", "Other"].map((r) => <button key={r} type="button" aria-pressed={voidReason === r} onClick={() => setVoidReason(r)}>{r}</button>)}
                      <Button label={voidReason ? `Void PKR ${fmt(detail.gross)}` : "Choose a reason"} variant="destructive" isDisabled={!voidReason}
                        onClick={() => { setSales((r) => r.map((x) => (x.id === detail.id ? { ...x, status: "reversed" } : x))); announce(`PKR ${fmt(detail.gross)} voided. The shopper gets an SMS.`); setDetail(null); setVoidReason(null); }} />
                    </section>
                  ))}
              </VStack>
            )}
          </BottomSheet>

          <span className={styles.launch} aria-hidden="true">
            <span className={styles.launchRing} />
            <Image src="/brand/fingerpay-wordmark.svg" alt="" width={116} height={26} loading="eager" />
          </span>
        </section>
      </main>
    </MotionConfig>
  );
}
