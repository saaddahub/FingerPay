"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../icons.tsx";
import { startGlobalLiquidGlass } from "../glass/liquid-glass.ts";
import s from "./widgets.module.css";

const COOKIE_STORAGE_KEY = "fp_cookie_consent_v1";
const REVIEW_STORAGE_KEY = "fp_review_prompt_v1";

const RATING_LABELS: Record<number, string> = {
  5: "5/5 · Low-key fire — ready for pilot",
  4: "4/5 · Clean counter flow & strong security",
  3: "3/5 · Solid prototype, want to see more",
  2: "2/5 · Needs refinement",
  1: "1/5 · Not convinced yet",
};

const TOPICS = [
  { id: "bank", label: "Bank Partner" },
  { id: "shop", label: "Pilot Kiryana Shop" },
  { id: "investor", label: "Judge / Investor" },
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

/** End-of-website & section email capture card that sends the FingerPay brief via Resend. */
export function EmailBriefBar({ heading = "Get the FingerPay brief in your inbox." }: { heading?: string }) {
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
    <aside className={s.emailBar} data-liquid-surface aria-label="Receive project brief by email">
      <div className={s.emailBarCopy}>
        <h3 className={s.emailBarTitle}>{heading}</h3>
        <p className={s.emailBarSub}>
          Enter your email and we will send you a thank-you note with the FingerPay architecture brief, fee math, and
          demo wallet link via Resend.
        </p>
      </div>
      {sentTo ? (
        <div className={s.statusBox} role="status">
          <span className={s.statusIcon}><Icon name="check" /></span>
          <div className={s.statusText}>
            <strong>Brief sent to {sentTo}</strong>
            <span>Check your inbox for the FingerPay Paper &amp; Ink summary.</span>
          </div>
        </div>
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
            {busy ? "Sending…" : "Send me the brief"} <Icon name="arrow-right" />
          </button>
          {error ? <p className={s.errorNote} role="alert">{error}</p> : null}
        </form>
      )}
    </aside>
  );
}

/** Global Cookie Consent Panel, Scroll/Entry Review Popup, and Contact Modal. */
export function SiteWidgets() {
  const [cookieOpen, setCookieOpen] = useState(false);
  const [cookieDetails, setCookieDetails] = useState(false);

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
      const t = window.setTimeout(() => setCookieOpen(true), 700);
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
      if (scrolled > 380 || scrolled / docHeight > 0.25) {
        triggerReview();
      }
    };

    const timer = window.setTimeout(triggerReview, 14000);
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
          <div className={s.cookieHeader}>
            <span className={s.cookieTitle}>
              <Icon name="cookie" /> Cookies on FingerPay
            </span>
            <button type="button" className={s.btnText} onClick={() => setCookieDetails((v) => !v)}>
              {cookieDetails ? "Hide details" : "Inspect cookies"}
            </button>
          </div>
          <p className={s.cookieCopy}>
            We use first-party session cookies (<code>sb-*</code>) for your demo wallet sign-in and a preference cookie
            to remember your choices. Zero third-party ad trackers.
          </p>
          {cookieDetails ? (
            <dl className={s.cookieTable}>
              <div className={s.cookieRow}>
                <dt className={s.cookieKey}>sb-auth-token</dt>
                <dd className={s.cookieVal}>Supabase session · Essential</dd>
              </div>
              <div className={s.cookieRow}>
                <dt className={s.cookieKey}>fp_cookie_consent</dt>
                <dd className={s.cookieVal}>Consent memory · 1 year</dd>
              </div>
              <div className={s.cookieRow}>
                <dt className={s.cookieKey}>fp_review_prompt</dt>
                <dd className={s.cookieVal}>Popup dismissal · 30 days</dd>
              </div>
            </dl>
          ) : null}
          <div className={s.cookieActions}>
            <button type="button" className={s.btnDark} onClick={() => saveCookieConsent("all")}>
              Accept all <Icon name="check" />
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
                <h2 id="fp-review-title" className={s.modalTitle}>How does FingerPay feel so far?</h2>
                <p className={s.modalLead}>
                  Leave a quick rating and your email — we’ll send you a thank-you note with the FingerPay project
                  brief right away.
                </p>
              </div>
              <button type="button" className={s.closeBtn} onClick={skipReview} aria-label="Skip review">
                <Icon name="close" />
              </button>
            </div>

            {reviewDone ? (
              <div className={s.form}>
                <div className={s.statusBox} role="status">
                  <span className={s.statusIcon}><Icon name="check" /></span>
                  <div className={s.statusText}>
                    <strong>Thank you — email sent to {reviewDone}</strong>
                    <span>We’ve recorded your {rating}/5 rating and emailed you the FingerPay overview.</span>
                  </div>
                </div>
                <div className={s.modalFooter}>
                  <button type="button" className={s.btnDark} onClick={() => setReviewOpen(false)}>
                    Back to FingerPay
                  </button>
                </div>
              </div>
            ) : (
              <form className={s.form} onSubmit={submitReview}>
                <div className={s.ratingSection}>
                  <div className={s.ratingRow} role="radiogroup" aria-label="Rating out of 5 stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} out of 5 stars`}
                        data-active={n <= rating}
                        className={s.starBtn}
                        onClick={() => setRating(n)}
                      >
                        <Icon name="star" />
                      </button>
                    ))}
                  </div>
                  <span className={s.ratingCaption}>{RATING_LABELS[rating]}</span>
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-review-email" className={s.label}>Your email (for the thank-you brief)</label>
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
                  <label htmlFor="fp-review-note" className={s.label}>Quick thought (optional)</label>
                  <textarea
                    id="fp-review-note"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="What stood out — the 3-second thumb tap, SMS LOCK, or the liquid glass feel?"
                    className={s.textarea}
                  />
                </div>

                {reviewError ? <p className={s.errorNote} role="alert">{reviewError}</p> : null}

                <div className={s.modalFooter}>
                  <button type="button" className={s.btnGlass} onClick={skipReview}>
                    Skip for now
                  </button>
                  <button type="submit" className={s.btnDark} disabled={reviewBusy}>
                    {reviewBusy ? "Sending…" : "Send review & get email"} <Icon name="arrow-right" />
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
                <h2 id="fp-contact-title" className={s.modalTitle}>Contact the FingerPay team</h2>
                <p className={s.modalLead}>
                  Looking to pilot a store counter, partner on SBP Raast settlement, or review our spec? Leave your
                  email and we’ll send our project brief immediately.
                </p>
              </div>
              <button type="button" className={s.closeBtn} onClick={() => setContactOpen(false)} aria-label="Close contact panel">
                <Icon name="close" />
              </button>
            </div>

            {contactDone ? (
              <div className={s.form}>
                <div className={s.statusBox} role="status">
                  <span className={s.statusIcon}><Icon name="check" /></span>
                  <div className={s.statusText}>
                    <strong>Confirmation sent to {contactDone}</strong>
                    <span>Thank you for reaching out — check your inbox for the FingerPay brief.</span>
                  </div>
                </div>
                <div className={s.modalFooter}>
                  <button type="button" className={s.btnDark} onClick={() => setContactOpen(false)}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className={s.form} onSubmit={submitContact}>
                <div className={s.field}>
                  <span className={s.label}>Inquiry track</span>
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
                </div>

                <div className={s.field}>
                  <label htmlFor="fp-contact-name" className={s.label}>Your name (optional)</label>
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
                  <label htmlFor="fp-contact-email" className={s.label}>Your email address</label>
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
                    placeholder="Tell us about your branch, store counter, or question…"
                    className={s.textarea}
                  />
                </div>

                {contactError ? <p className={s.errorNote} role="alert">{contactError}</p> : null}

                <div className={s.modalFooter}>
                  <button type="button" className={s.btnGlass} onClick={() => setContactOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={s.btnDark} disabled={contactBusy}>
                    {contactBusy ? "Sending…" : "Send & receive brief"} <Icon name="arrow-right" />
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
