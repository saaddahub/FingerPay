"use client";

import { useState, type FormEvent } from "react";
import { Nav, HonestyPill } from "../nav/nav.tsx";
import { Footer } from "../close/close.tsx";
import { SmoothScroll } from "../scroll/smooth-scroll.tsx";
import { InkField } from "../ink/ink.tsx";
import { SiteWidgets } from "../widgets/site-widgets.tsx";
import { Icon } from "../icons.tsx";
import p from "./pages.module.css";
import w from "../widgets/widgets.module.css";

const TOPICS = [
  { id: "bank", label: "Bank partner" },
  { id: "shop", label: "Pilot shop" },
  { id: "investor", label: "Judge / investor" },
  { id: "general", label: "General" },
] as const;

export function ContactPage() {
  const [topic, setTopic] = useState<"bank" | "shop" | "investor" | "general">("bank");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [revEmail, setRevEmail] = useState("");
  const [revNote, setRevNote] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [revDone, setRevDone] = useState<string | null>(null);
  const [revError, setRevError] = useState<string | null>(null);

  const onContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          kind: "contact",
          topic,
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(message.trim() ? { message: message.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Could not send message.");
      }
      setDone(trimmed);
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setBusy(false);
    }
  };

  const onReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = revEmail.trim();
    if (!trimmed) return;
    setRevBusy(true);
    setRevError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          kind: "review",
          rating,
          ...(revNote.trim() ? { message: revNote.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Could not submit review.");
      }
      setRevDone(trimmed);
      setRevEmail("");
      setRevNote("");
    } catch (err) {
      setRevError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setRevBusy(false);
    }
  };

  return (
    <>
      <a href="#contact-main" className="skip-link">Skip to content</a>
      <span id="top" />
      <Nav />
      <main id="contact-main" className={p.page}>
        <section className={`${p.hero} page-grid`} aria-labelledby="contact-title">
          <h1 id="contact-title" className={p.heroTitle}>
            Write to the team.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>We are looking for a bank partner and a pilot counter.</strong> Leave your email below and we’ll
            send a thank-you note with the FingerPay project brief right away.
          </p>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="desk-title">
          <div className={p.leftSticky}>
            <h2 id="desk-title" className={p.sectionTitle}>Direct note or review.</h2>
            <p className={`${p.sectionSub} two-tone t-lead`}>
              <strong>Every submission dispatches the technical summary to your inbox.</strong> Powered by Resend.
            </p>
          </div>
          <div className={p.rightStream}>
            <article className={p.hardFormCard}>
              <h3 className={p.streamTitle}>Contact the team</h3>
              {done ? (
                <p className="two-tone t-lead" role="status">
                  <strong>Sent to {done}.</strong> Check your inbox for the FingerPay brief.
                </p>
              ) : (
                <form className={w.form} onSubmit={onContactSubmit}>
                  <div className={w.topicPills}>
                    {TOPICS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        data-active={topic === t.id}
                        className={w.topicPill}
                        onClick={() => setTopic(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className={w.field}>
                    <label htmlFor="page-contact-name" className={w.label}>Name (optional)</label>
                    <input
                      id="page-contact-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rasheed Ahmed"
                      className={w.input}
                      autoComplete="name"
                    />
                  </div>
                  <div className={w.field}>
                    <label htmlFor="page-contact-email" className={w.label}>Email</label>
                    <input
                      id="page-contact-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={w.input}
                      autoComplete="email"
                    />
                  </div>
                  <div className={w.field}>
                    <label htmlFor="page-contact-msg" className={w.label}>Message (optional)</label>
                    <textarea
                      id="page-contact-msg"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Your branch, shop, or question…"
                      className={w.textarea}
                    />
                  </div>
                  {error ? <p className={w.errorNote} role="alert">{error}</p> : null}
                  <div>
                    <button type="submit" className={w.btnDark} disabled={busy}>
                      {busy ? "Sending…" : "Send note"} <Icon name="arrow-right" />
                    </button>
                  </div>
                </form>
              )}
            </article>

            <article className={p.hardFormCard}>
              <h3 className={p.streamTitle}>Leave a review</h3>
              {revDone ? (
                <p className="two-tone t-lead" role="status">
                  <strong>Sent to {revDone}.</strong> Thank you for the {rating}/5 rating.
                </p>
              ) : (
                <form className={w.form} onSubmit={onReviewSubmit}>
                  <div className={w.ratingRow} role="radiogroup" aria-label="Rating out of 5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} out of 5`}
                        data-active={n <= rating}
                        className={w.starBtn}
                        onClick={() => setRating(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className={w.field}>
                    <label htmlFor="page-review-email" className={w.label}>Email</label>
                    <input
                      id="page-review-email"
                      type="email"
                      required
                      value={revEmail}
                      onChange={(e) => setRevEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={w.input}
                      autoComplete="email"
                    />
                  </div>
                  <div className={w.field}>
                    <label htmlFor="page-review-note" className={w.label}>Note (optional)</label>
                    <input
                      id="page-review-note"
                      type="text"
                      value={revNote}
                      onChange={(e) => setRevNote(e.target.value)}
                      placeholder="One line on the counter flow or design…"
                      className={w.input}
                    />
                  </div>
                  {revError ? <p className={w.errorNote} role="alert">{revError}</p> : null}
                  <div>
                    <button type="submit" className={w.btnDark} disabled={revBusy}>
                      {revBusy ? "Sending…" : "Send review"} <Icon name="arrow-right" />
                    </button>
                  </div>
                </form>
              )}
            </article>
          </div>
        </section>
      </main>
      <Footer />
      <HonestyPill />
      <SmoothScroll />
      <InkField />
      <SiteWidgets />
    </>
  );
}
