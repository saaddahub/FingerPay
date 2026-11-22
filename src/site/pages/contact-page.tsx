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
  { id: "bank", label: "Bank Partner (Allied Bank / SBP Raast)" },
  { id: "shop", label: "Pilot Kiryana Store / Campus Counter" },
  { id: "investor", label: "Competition Judge / Investor" },
  { id: "general", label: "General Question" },
] as const;

const RATING_LABELS: Record<number, string> = {
  5: "5/5 · Low-key fire — ready for pilot",
  4: "4/5 · Clean counter flow & strong security",
  3: "3/5 · Solid prototype, want to see more",
  2: "2/5 · Needs refinement",
  1: "1/5 · Not convinced yet",
};

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
            Write to the team. Get the brief in your inbox.
          </h1>
          <p className={`${p.heroLead} two-tone t-lead`}>
            <strong>We are looking for a bank partner and a pilot kiryana counter.</strong> Enter your email below to
            contact the team or leave a review — our Resend integration will immediately email you a thank-you note and
            the FingerPay technical brief.
          </p>
        </section>

        <section className={`${p.section} page-grid`} aria-labelledby="forms-title">
          <h2 id="forms-title" className="visually-hidden">Contact and Review Forms</h2>
          <div className={p.splitGrid}>
            <article className={p.glassPanel}>
              <span className="t-mono-s">Partner &amp; Pilot Desk</span>
              <h3 className={p.panelHeading}>Contact the FingerPay team</h3>
              <p className={p.panelBody}>
                Select your track and enter your email. We will log your inquiry and send you the FingerPay Paper &amp;
                Ink project summary immediately.
              </p>

              {done ? (
                <div className={w.statusBox} role="status">
                  <span className={w.statusIcon}><Icon name="check" /></span>
                  <div className={w.statusText}>
                    <strong>Thank you — email sent to {done}</strong>
                    <span>Check your inbox for the FingerPay confirmation and architecture brief.</span>
                  </div>
                </div>
              ) : (
                <form className={w.form} onSubmit={onContactSubmit}>
                  <div className={w.field}>
                    <span className={w.label}>Inquiry track</span>
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
                  </div>

                  <div className={w.field}>
                    <label htmlFor="page-contact-name" className={w.label}>Your name</label>
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
                    <label htmlFor="page-contact-email" className={w.label}>Your email address (required)</label>
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
                    <label htmlFor="page-contact-msg" className={w.label}>Message</label>
                    <textarea
                      id="page-contact-msg"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your branch, store counter, or question…"
                      className={w.textarea}
                    />
                  </div>

                  {error ? <p className={w.errorNote} role="alert">{error}</p> : null}

                  <div>
                    <button type="submit" className={w.btnDark} disabled={busy}>
                      {busy ? "Sending…" : "Send message & get email"} <Icon name="arrow-right" />
                    </button>
                  </div>
                </form>
              )}
            </article>

            <article className={p.glassPanel}>
              <span className="t-mono-s">Judge &amp; Visitor Feedback</span>
              <h3 className={p.panelHeading}>Review the FingerPay prototype</h3>
              <p className={p.panelBody}>
                How does the 3-second thumb checkout, liquid glass UI, and ink-in-water simulation feel? Rate the
                experience and receive a copy of your review by email.
              </p>

              {revDone ? (
                <div className={w.statusBox} role="status">
                  <span className={w.statusIcon}><Icon name="check" /></span>
                  <div className={w.statusText}>
                    <strong>Review recorded — thank-you email sent to {revDone}</strong>
                    <span>Thank you for rating FingerPay ({rating}/5 stars).</span>
                  </div>
                </div>
              ) : (
                <form className={w.form} onSubmit={onReviewSubmit}>
                  <div className={w.ratingSection}>
                    <div className={w.ratingRow} role="radiogroup" aria-label="Rating out of 5 stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${n} out of 5 stars`}
                          data-active={n <= rating}
                          className={w.starBtn}
                          onClick={() => setRating(n)}
                        >
                          <Icon name="star" />
                        </button>
                      ))}
                    </div>
                    <span className={w.ratingCaption}>{RATING_LABELS[rating]}</span>
                  </div>

                  <div className={w.field}>
                    <label htmlFor="page-review-email" className={w.label}>Your email address (required)</label>
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
                    <label htmlFor="page-review-note" className={w.label}>Your review notes</label>
                    <textarea
                      id="page-review-note"
                      value={revNote}
                      onChange={(e) => setRevNote(e.target.value)}
                      placeholder="Share your thoughts on the counter speed, SMS LOCK, or design…"
                      className={w.textarea}
                    />
                  </div>

                  {revError ? <p className={w.errorNote} role="alert">{revError}</p> : null}

                  <div>
                    <button type="submit" className={w.btnDark} disabled={revBusy}>
                      {revBusy ? "Submitting…" : "Submit review & get thank-you email"} <Icon name="arrow-right" />
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
