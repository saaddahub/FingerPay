"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../icons.tsx";
import { startGlobalLiquidGlass } from "../glass/liquid-glass.ts";
import s from "./widgets.module.css";

const COOKIE_STORAGE_KEY = "fp_cookie_consent_v1";
const REVIEW_STORAGE_KEY = "fp_review_prompt_v1";

const TOPICS = [
  { id: "bank", label: "Bank partner" },
  { id: "shop", label: "Pilot shop" },
  { id: "investor", label: "Judge / investor" },
  { id: "general", label: "General" },
] as const;

export function openReviewPopup() {
  window.dispatchEvent(new CustomEvent("fp:open-review"));
}

export function openCookiePanel() {
  window.dispatchEvent(new CustomEvent("fp:open-cookies"));
}

export function openContactModal() {
  window.dispatchEvent(new CustomEvent("fp:open-contact"));
}

/** Minimalist end-of-website email row (stiff left heading + quiet right input). */
export function EmailBriefBar({ heading = "Project brief, by email." }: { heading?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, kind: "subscribe" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Could not send email right now.");
      }
      setSentTo(trimmed);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className={s.emailBar} aria-label="Receive project brief by email">
      <div className={s.emailBarCopy}>
        <h3 className="t-display">{heading}</h3>
        <p className="two-tone t-lead">
          <strong>Leave your address.</strong> We’ll send a thank-you note with the architecture summary, fee math, and
          demo link.
        </p>
      </div>
      <div className={s.emailBarRight}>
        {sentTo ? (
          <p className="two-tone t-lead" role="status">
            <strong>Sent to {sentTo}.</strong> Check your inbox for the FingerPay brief.
          </p>
        ) : (
          <form className={s.emailBarForm} onSubmit={onSubmit}>
            <label htmlFor="fp-footer-email" className="visually-hidden">Your email address</label>
            <input
              id="fp-footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className={s.emailBarInput}
              autoComplete="email"
            />
            <button type="submit" className={s.btnDark} disabled={busy}>
              {busy ? "Sending…" : "Send brief"} <Icon name="arrow-right" />
            </button>
            {error ? <p className={s.errorNote} role="alert">{error}</p> : null}
          </form>
        )}
      </div>
    </aside>
  );
}

/** Global Cookie Consent Pill, Scroll/Entry Review Dialog, and Contact Dialog. */
export function SiteWidgets() {
  const [cookieOpen, setCookieOpen] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewDone, setReviewDone] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [contactOpen, setContactOpen] = useState(false);
  const [contactTopic, setContactTopic] = useState<"bank" | "shop" | "investor" | "general">("bank");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactDone, setContactDone] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    return startGlobalLiquidGlass();
  }, []);

  useEffect(() => {
    const savedCookie = window.localStorage.getItem(COOKIE_STORAGE_KEY);
    if (!savedCookie) {
      const t = window.setTimeout(() => setCookieOpen(true), 800);
      return () => window.clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const alreadyHandled = window.localStorage.getItem(REVIEW_STORAGE_KEY);
    if (alreadyHandled) return;

    let triggered = false;
    const triggerReview = () => {
      if (triggered) return;
      triggered = true;
      setReviewOpen(true);
    };

    const onScroll = () => {
      const scrolled = window.scrollY;
      const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (scrolled > 420 || scrolled / docHeight > 0.28) {
        triggerReview();
      }
    };

    const timer = window.setTimeout(triggerReview, 16000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const onOpenReview = () => {
      setReviewDone(null);
      setReviewError(null);
      setReviewOpen(true);
    };
    const onOpenCookies = () => setCookieOpen(true);
    const onOpenContact = () => {
      setContactDone(null);
      setContactError(null);
      setContactOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReviewOpen(false);
        setContactOpen(false);
      }
    };

    window.addEventListener("fp:open-review", onOpenReview);
    window.addEventListener("fp:open-cookies", onOpenCookies);
    window.addEventListener("fp:open-contact", onOpenContact);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("fp:open-review", onOpenReview);
      window.removeEventListener("fp:open-cookies", onOpenCookies);
      window.removeEventListener("fp:open-contact", onOpenContact);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const saveCookieConsent = (level: "all" | "essential") => {
    window.localStorage.setItem(COOKIE_STORAGE_KEY, level);
    document.cookie = `fp_cookie_consent=${level}; Path=/; Max-Age=31536000; SameSite=Lax`;
    setCookieOpen(false);
  };

  const skipReview = () => {
    window.localStorage.setItem(REVIEW_STORAGE_KEY, "skipped");
    document.cookie = "fp_review_prompt=skipped; Path=/; Max-Age=2592000; SameSite=Lax";
    setReviewOpen(false);
  };

  const submitReview = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = reviewEmail.trim();
    if (!trimmed) return;
    setReviewBusy(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          kind: "review",
          rating,
          ...(reviewText.trim() ? { message: reviewText.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Could not submit review.");
      }
      window.localStorage.setItem(REVIEW_STORAGE_KEY, "submitted");
      document.cookie = "fp_review_prompt=submitted; Path=/; Max-Age=31536000; SameSite=Lax";
      setReviewDone(trimmed);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setReviewBusy(false);
    }
  };

  const submitContact = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = contactEmail.trim();
    if (!trimmed) return;
    setContactBusy(true);
    setContactError(null);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          kind: "contact",
          topic: contactTopic,
          ...(contactName.trim() ? { name: contactName.trim() } : {}),
          ...(contactMsg.trim() ? { message: contactMsg.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Could not send message.");
      }
      setContactDone(trimmed);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setContactBusy(false);
    }
  };

  return (
    <>
      {cookieOpen ? (
        <aside className={s.cookieAside} data-liquid-surface aria-label="Cookie consent">
          <p className={`${s.cookieCopy} two-tone`}>
            <strong>Cookies keep your demo session signed in.</strong> First-party only (<code>sb-*</code>); zero ad
            trackers.
          </p>
          <div className={s.cookieActions}>
            <button type="button" className={s.btnDark} onClick={() => saveCookieConsent("all")}>
              Accept
            </button>
            <button type="button" className={s.btnGlass} onClick={() => saveCookieConsent("essential")}>
              Essential only
            </button>
          </div>
        </aside>
      ) : null}

      {reviewOpen ? (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="fp-review-title"
          onClick={(e) => e.target === e.currentTarget && skipReview()}>
          <div className={s.modal} data-liquid-surface>
            <div className={s.modalTop}>
              <div className={s.modalHeadingGroup}>
                <h2 id="fp-review-title" className={s.modalTitle}>A quick thought.</h2>
                <p className={`${s.modalLead} two-tone`}>
                  <strong>How does FingerPay read so far?</strong> Leave a rating and your email — we’ll send you the
                  project brief right away.
                </p>
              </div>
              <button type="button" className={s.closeBtn} onClick={skipReview} aria-label="Skip review">
                <Icon name="close" />
              </button>
            </div>

            {reviewDone ? (
              <div className={s.form}>
                <p className="two-tone t-lead" role="status">
                  <strong>Sent to {reviewDone}.</strong> Thank you for the {rating}/5 note.
                </p>
                <div className={s.modalFooter}>
                  <button type="button" className={s.btnDark} onClick={() => setReviewOpen(false)}>
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <form className={s.form} onSubmit={submitReview}>
                <div className={s.ratingRow} role="radiogroup" aria-label="Rating out of 5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} out of 5`}
                      data-active={n <= rating}
                      className={s.starBtn}
                      onClick={() => setRating(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-review-email" className={s.label}>Email</label>
                  <input
                    id="fp-review-email"
                    type="email"
                    required
                    value={reviewEmail}
                    onChange={(e) => setReviewEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={s.input}
                    autoComplete="email"
                  />
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-review-note" className={s.label}>Note (optional)</label>
                  <input
                    id="fp-review-note"
                    type="text"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="One line on the counter flow or design…"
                    className={s.input}
                  />
                </div>

                {reviewError ? <p className={s.errorNote} role="alert">{reviewError}</p> : null}

                <div className={s.modalFooter}>
                  <button type="button" className={s.btnText} onClick={skipReview}>
                    Skip
                  </button>
                  <button type="submit" className={s.btnDark} disabled={reviewBusy}>
                    {reviewBusy ? "Sending…" : "Send"} <Icon name="arrow-right" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {contactOpen ? (
        <div className={s.overlay} role="dialog" aria-modal="true" aria-labelledby="fp-contact-title"
          onClick={(e) => e.target === e.currentTarget && setContactOpen(false)}>
          <div className={s.modal} data-liquid-surface>
            <div className={s.modalTop}>
              <div className={s.modalHeadingGroup}>
                <h2 id="fp-contact-title" className={s.modalTitle}>Write to the team.</h2>
                <p className={`${s.modalLead} two-tone`}>
                  <strong>Looking to pilot a counter or partner on settlement?</strong> Leave your email and we’ll send
                  our brief immediately.
                </p>
              </div>
              <button type="button" className={s.closeBtn} onClick={() => setContactOpen(false)} aria-label="Close contact panel">
                <Icon name="close" />
              </button>
            </div>

            {contactDone ? (
              <div className={s.form}>
                <p className="two-tone t-lead" role="status">
                  <strong>Sent to {contactDone}.</strong> Check your inbox for the FingerPay brief.
                </p>
                <div className={s.modalFooter}>
                  <button type="button" className={s.btnDark} onClick={() => setContactOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className={s.form} onSubmit={submitContact}>
                <div className={s.topicPills}>
                  {TOPICS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      data-active={contactTopic === t.id}
                      className={s.topicPill}
                      onClick={() => setContactTopic(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-contact-name" className={s.label}>Name (optional)</label>
                  <input
                    id="fp-contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Ayesha Khan"
                    className={s.input}
                    autoComplete="name"
                  />
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-contact-email" className={s.label}>Email</label>
                  <input
                    id="fp-contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={s.input}
                    autoComplete="email"
                  />
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-contact-msg" className={s.label}>Message (optional)</label>
                  <textarea
                    id="fp-contact-msg"
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="Your branch, shop, or question…"
                    className={s.textarea}
                  />
                </div>

                {contactError ? <p className={s.errorNote} role="alert">{contactError}</p> : null}

                <div className={s.modalFooter}>
                  <button type="button" className={s.btnText} onClick={() => setContactOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={s.btnDark} disabled={contactBusy}>
                    {contactBusy ? "Sending…" : "Send"} <Icon name="arrow-right" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
