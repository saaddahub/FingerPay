import { Art } from "./art";
import { connection } from "next/server";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Theme } from "@astryxdesign/core/theme";
import { themes } from "../astryx-themes";
import { HoldToPay, PauseToggle } from "./hold-to-pay";
import { LandingMotion } from "./landing-motion";
import { HOW_STEPS, HowFilm } from "./how-film";
import { ScannerArt } from "./scanner-art";
import s from "./landing.module.css";

// Copy: docs/design/CONTENT.md. Design: docs/design/comps/landing-v1.html. Every number is a SPEC figure.

const torn = (...extra: string[]) => [s.torn, ...extra].join(" ");

function Mark({ className }: { className?: string }) {
  return <svg className={className} aria-hidden="true"><use href="#fp-mark" /></svg>;
}

function Check() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><use href="#fp-check" /></svg>;
}

const problems = [
  { cls: s.probA, art: "grocer-lean", w: 268, h: 900, alt: "Rasheed looks down at an empty hand. There is no change in the drawer.", title: "No change", text: "A PKR 1,000 note empties the drawer, and cash at the till invites theft." },
  { cls: s.probB, art: "student", w: 344, h: 770, alt: "A shopper holds out a phone with a transfer screenshot.", title: "Can't trust the screenshot", text: "A transfer screenshot proves nothing: it can be edited. The shopkeeper checks them all again at night." },
  { cls: s.probC, art: "lady-idle", w: 301, h: 748, alt: "A shopper with a basket and no smartphone.", title: "No smartphone, no card", text: "QR and wallet apps need a smartphone, mobile data and a PIN. A shopper with a keypad phone is left out." },
];

const shopPoints = [
  ["One line, no doubt", "Each result is one plain line, such as PAYMENT SUCCESSFUL — PKR 180 RECEIVED. There's no screenshot to inspect."],
  ["Today's ledger", "Every sale with its time, amount, fee, net and Raast reference (simulated). Shoppers appear as a first name and initial, and only on settled sales."],
  ["Fix a mistake the same day", "Typed PKR 1,800 instead of 180? The owner voids the sale with a reason. The shopper gets the money back and an SMS."],
  ["Export the day", "The owner downloads the day's settlement as a CSV for the accountant."],
  ["Private by design", "The shop never sees a shopper's balance, CNIC or phone number. On a decline, the screen says why and never who."],
  ["Offline is clear", "If the internet drops, the screen says TAKE CASH. Nothing is queued, so nothing gets charged later by surprise."],
] as const;

const protections = [
  ["No fingerprint images", "No fingerprint image is stored, sent or logged. The database keeps only a keyed code (an HMAC), made with a key that never enters the database. A copy of the database alone holds no usable thumbs and no readable CNICs.", null],
  ["Thumb Lock by SMS", "Reply LOCK to any FingerPay SMS and thumb payments stop. Only a bank branch can unlock them, with the shopper's CNIC.", "Why: in India, fraudsters have lifted thumbprints from public property records, cast them in silicone and emptied bank accounts. The defence police there recommend most is a biometric lock the owner controls. Sources: Deccan Herald, Gujarat Cyber Crime, Scroll."],
  ["An alert on every attempt", "The shopper gets an SMS for every payment, every declined attempt with their thumb, and any try on a locked thumb. Misuse shows up the same day, not on next month's statement.", null],
  ["Retries never charge twice", "Each sale is one charge on the server. If the network stutters and the terminal asks again, the server replays the first receipt instead of charging again. Paying the same shop the same amount again within 15 seconds is blocked.", null],
  ["Limits", "A thumb pays at most PKR 5,000 a tap on a salary account and PKR 2,000 on a student account, with daily caps of PKR 15,000 and PKR 5,000. Each sale allows 3 tries, and 10 unknown thumbs in 10 minutes pauses the terminal.", null],
] as const;

const numbers = [
  ["Thumb to confirmation", "< 3 s", "The shop's screen confirms before the shopper turns to leave."],
  ["Fingerprint images stored", "0", "Only a keyed code is kept, with a key the database never holds."],
  ["Fee on sales above PKR 100", "0.45%", "Capped at PKR 25. Sales of PKR 100 or less are free."],
  ["Cheaper than a card machine", "4.4–5.6×", "Compared with a 2.0–2.5% card fee."],
  ["Charged on a decline", "PKR 0", "No fee, ever, when a payment doesn't go through."],
  ["Most a thumb pays per tap", "5,000 / 2,000", "PKR, salary / student accounts, with daily caps too."],
] as const;

export default async function Home() {
  await connection(); // The proxy supplies a fresh CSP nonce for each HTML response.

  return (
    // The site is paper-light by decision (TYPE-AND-COLOR.md §2.1); the art is drawn for a light ground.
    <Theme theme={themes.fingerpay} mode="light">
    <main className={s.page} data-m="page">
      <LandingMotion />
      <svg className={s.sprite} aria-hidden="true" focusable="false">
        <symbol id="fp-check" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></symbol>
        <symbol id="fp-dash" viewBox="0 0 16 16"><path d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
        <symbol id="fp-mark" viewBox="-214.13 -252.5 428.26 404.5"><g fill="none" stroke="currentColor" strokeWidth="33"><path d="M-59 125V0A59 59 0 0 1 59 0V73" /><path d="M-118 86V0A118 118 0 0 1 118 0V152" /><path d="M-177 47V0A177 177 0 0 1 177 0V99" /><path d="M-200.14 -125.06A236 236 0 0 1 200.14 -125.06" /><path d="M0 -7V139" /></g></symbol>
      </svg>
      <a className={s.skip} href="#content">Skip to content</a>

      <header className={s.nav} data-m="nav">
        <nav className={`${s.wrap} ${s.navBar}`} aria-label="Main navigation">
          <a className={s.brand} href="#hero" aria-label="FingerPay, back to top">
            <Mark />
            <Art src="/brand/fingerpay-wordmark.svg" width={90} height={20} alt="" priority />
          </a>
          <ul className={s.navLinks}>
            <li><a href="#how">How it works</a></li>
            <li><a href="#shops">For shops</a></li>
            <li><a href="#safety">Safety</a></li>
            <li><a href="#phones">Every phone</a></li>
            <li><a href="#numbers">Numbers</a></li>
          </ul>
          <a className={s.honesty} href="#disclaimer">Student prototype · integrations simulated</a>
          <PauseToggle />
        </nav>
      </header>

      <article id="content" tabIndex={-1}>
        {/* Hero */}
        <section className={s.hero} id="hero" aria-labelledby="hero-title">
          <section className={s.heroPin} aria-label="Hero">
          <section className={s.heroStage} data-m="hero-stage" aria-label="Counter">
          <header className={`${s.wrap} ${s.heroHead}`} data-m="hero-head">
            <Heading level={1} id="hero-title" className={`${s.display} ${s.heroTitle}`} data-m="hero-title">
              <span className={s.heroLine} data-m="hero-line">Your thumb is</span> <span className={s.heroLine} data-m="hero-line">the whole wallet.</span>
            </Heading>
            <section className={s.heroCopy} aria-label="Summary">
              <Text as="p" display="block" className={s.lead}>At a kiryana counter, a shopper pays with one thumb tap: no phone, card, PIN or cash. The shop&apos;s own screen confirms the sale in under 3 seconds, and the shopper gets an SMS receipt.</Text>
              <nav className={s.links} aria-label="Jump to"><a href="#how">See how it works</a><a href="#safety">See how it stays safe</a></nav>
              <Text as="p" display="block" className={s.meta}>Student prototype. Bank, identity and payment integrations are simulated.</Text>
            </section>
          </header>
          <HoldToPay />
          </section>
          <Text as="p" display="block" className={`${s.display} ${s.heroResult}`} data-m="hero-result" aria-hidden="true">Under 3 seconds, no phone.</Text>
          </section>
        </section>

        {/* Problem */}
        <section className={s.section} id="problem" aria-labelledby="problem-title">
          <section className={s.wrap} aria-label="Checkout today">
            <header className={s.sectionHead}>
              <Heading level={2} id="problem-title" className={`${s.display} ${s.h2} ${s.problemTitle}`}>Every way to pay asks for something the shopper doesn&apos;t have.</Heading>
            </header>
            <ul className={s.probGrid} role="list">
              {problems.map((p) => (
                <li key={p.title} className={`${s.prob} ${p.cls}`} data-m="tilt">
                  <Art className={s.cutout} src={`/art/${p.art}.webp`} width={p.w} height={p.h} alt={p.alt} m="paste" />
                  <Heading level={3} className={`${s.tag} ${torn(s.tornLr)}`} data-m="slap">{p.title}</Heading>
                  <Text as="p" display="block" className={s.body}>{p.text}</Text>
                </li>
              ))}
            </ul>
            <aside className={torn(s.tornLr, s.inkPaper, s.strip)} data-m="strip">
              <Text as="p" display="block" className={`${s.display} ${s.stripText}`}>Card machines need a card, and charge the shop 2.0–2.5% a sale.</Text>
            </aside>
          </section>
        </section>

        {/* Marquee */}
        <section className={s.marquee} data-m="marquee" aria-hidden="true">
          <span className={`${s.display} ${s.marqueeRow}`} data-m="marquee-a">No phone · No card · No PIN · No cash · No phone · No card · No PIN · No cash ·</span>
          <span className={`${s.display} ${s.marqueeRow} ${s.marqueeHollow}`} data-m="marquee-b">Just a thumb · Just a thumb · Just a thumb · Just a thumb · Just a thumb ·</span>
        </section>

        {/* How it works */}
        <section className={s.section} id="how" aria-labelledby="how-title">
          <section className={s.wrap} aria-label="Four steps">
            <header className={s.sectionHead}>
              <Heading level={2} id="how-title" className={`${s.display} ${s.h2} ${s.howTitle}`}>One sale, under 3 seconds.</Heading>
              <Text as="p" display="block" className={`${s.body} ${s.howIntro}`}>Four steps between the cashier typing PKR 180 and the shopper walking out with bread.</Text>
            </header>
            <ol className={s.stairs}>
              <li className={s.step} data-m="step">
                <span className={s.stepRule} data-m="rule" aria-hidden="true" />
                <Text as="span" className={`${s.display} ${s.stepNum}`} aria-hidden="true" data-m="part">1</Text>
                <figure className={s.artifact} aria-hidden="true" data-m="part">
                  <span className={s.keypad}>
                    <span className={`${s.keypadAmount} ${s.mono}`}><small>PKR</small>180</span>
                    <span className={s.keys}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => <span key={k}>{k}</span>)}</span>
                    <span className={s.charge}>Charge PKR 180</span>
                  </span>
                </figure>
                <Heading level={3} className={s.h3}>{HOW_STEPS[0].title}</Heading>
                <Text as="p" display="block" className={s.body}>{HOW_STEPS[0].text}</Text>
              </li>
              <li className={s.step} data-m="step">
                <span className={s.stepRule} data-m="rule" aria-hidden="true" />
                <Text as="span" className={`${s.display} ${s.stepNum}`} aria-hidden="true" data-m="part">2</Text>
                <figure className={s.artifact} aria-hidden="true" data-m="part"><span className={s.miniScan} data-m="sensor"><ScannerArt /><span className={s.miniThumb} /></span></figure>
                <Heading level={3} className={s.h3}>{HOW_STEPS[1].title}</Heading>
                <Text as="p" display="block" className={s.body}>{HOW_STEPS[1].text}</Text>
              </li>
              <li className={s.step} data-m="step">
                <span className={s.stepRule} data-m="rule" aria-hidden="true" />
                <Text as="span" className={`${s.display} ${s.stepNum}`} aria-hidden="true" data-m="part">3</Text>
                <figure className={s.artifact} aria-hidden="true" data-m="part">
                  <ul className={s.miniList}>
                    {["Keyed code finds the account", "Thumb Lock is off", "Within the thumb-pay limit", "Balance covers it", "Settles over Raast (simulated)"].map((c) => <li key={c}><Check />{c}</li>)}
                  </ul>
                </figure>
                <Heading level={3} className={s.h3}>{HOW_STEPS[2].title}</Heading>
                <Text as="p" display="block" className={s.body}>{HOW_STEPS[2].text}</Text>
              </li>
              <li className={s.step} data-m="step">
                <span className={s.stepRule} data-m="rule" aria-hidden="true" />
                <Text as="span" className={`${s.display} ${s.stepNum}`} aria-hidden="true" data-m="part">4</Text>
                <figure className={s.artifact} aria-hidden="true" data-m="part"><span className={s.banner} data-m="banner">PAYMENT SUCCESSFUL — PKR 180 RECEIVED<small>Net PKR 179.19 · Fee PKR 0.81</small></span></figure>
                <Heading level={3} className={s.h3}>{HOW_STEPS[3].title}</Heading>
                <Text as="p" display="block" className={s.body}>{HOW_STEPS[3].text}</Text>
              </li>
            </ol>
            <HowFilm />
            <Text as="p" display="block" className={`${s.meta} ${s.fineprint}`}>Simulated here: the prototype stands in for the thumb scan with a one-time token. Real scanners need template matching and liveness detection.</Text>
          </section>
        </section>

        {/* For shops */}
        <section className={s.section} id="shops" aria-labelledby="shops-title">
          <section className={`${s.wrap} ${s.shopsGrid}`} aria-label="The shop terminal">
            <figure className={s.shopsStage}>
              <Art className={`${s.shopsShelf} ${s.cutout}`} src="/art/shelf.webp" width={779} height={700} alt="" depth={-60} />
              <Art className={`${s.shopsGrocer} ${s.cutout}`} src="/art/grocer-stand.webp" width={195} height={900} alt="" />
              <figcaption className={s.terminal} data-m="terminal">
                <section className={s.screen} aria-label="Today's ledger on the FingerPay terminal (demo data)">
                  <header className={s.screenTop}><span>Today</span><span>Rasheed Kiryana</span></header>
                  <Text as="span" className={s.net}>358<small>.38</small></Text>
                  <Text as="span" className={s.netLabel}>PKR settled to Allied Bank (simulated)</Text>
                  <ul className={s.ledger}>
                    <li className={s.row} data-m="row"><b>Ayesha K.</b><span className={s.rowAmount}>180.00</span><span className={s.rowStatus}><Check />Settled</span><span className={s.rowTime}>7:42 pm</span></li>
                    <li className={s.row} data-m="row"><b>Bilal H.</b><span className={s.rowAmount}>180.00</span><span className={s.rowStatus}><Check />Settled</span><span className={s.rowTime}>7:49 pm</span></li>
                    <li className={s.row} data-m="row"><b className={s.rowHidden}>Name not shown</b><span className={s.rowAmount}>500.00</span><span className={s.rowStatus} data-declined="true"><svg viewBox="0 0 16 16" aria-hidden="true"><use href="#fp-dash" /></svg>Declined · PKR 0 fee</span><span className={s.rowTime}>7:51 pm</span></li>
                  </ul>
                </section>
              </figcaption>
            </figure>
            <section className={s.shopsCopy} aria-label="What the shop gets">
              <Heading level={2} id="shops-title" className={`${s.display} ${s.h2}`}>The proof is on the shop&apos;s own screen.</Heading>
              <Text as="p" display="block" className={s.lead}>The FingerPay terminal is the only FingerPay app, and it belongs to the shop. Shoppers never install anything. It runs in a browser today; an Android app comes next.</Text>
              <ul className={s.points}>
                {shopPoints.map(([t, d]) => <li key={t} data-m="rise"><Heading level={3} className={s.h3}>{t}</Heading><Text as="p" display="block" className={s.body}>{d}</Text></li>)}
              </ul>
            </section>
          </section>
        </section>

        {/* Safety */}
        <section className={`${s.section} ${s.band}`} data-m="tear" id="safety" aria-labelledby="safety-title">
          <section className={s.wrap} aria-label="Protections">
            <header className={s.sectionHead}>
              <Heading level={2} id="safety-title" className={`${s.display} ${s.h2} ${s.safetyTitle}`}>Lock your thumb with one word.</Heading>
              <Text as="p" display="block" className={`${s.lead} ${s.safetyLead}`}>A thumb can&apos;t be changed like a PIN. So FingerPay assumes one will be copied someday, and limits what a copy can do.</Text>
            </header>
            <section className={s.safeGrid} aria-label="Five protections">
              <figure className={s.lockStage}>
                <Art className={s.cutout} src="/art/lady-idle.webp" width={301} height={748} alt="Ayesha has just texted LOCK." />
                <span className={s.said} aria-hidden="true" data-m="say">
                  <svg viewBox="0 0 150 96" preserveAspectRatio="none"><path d="M14 10 C50 3 104 2 138 10 C148 16 148 58 138 66 C112 72 82 71 62 72 L34 94 L42 71 C28 70 16 68 10 62 C2 50 3 18 14 10Z" /></svg>
                  <span>LOCK</span>
                </span>
                <figcaption className={torn(s.tornTb, s.reply)} data-m="print">
                  <Text as="span" className={s.tag}>Simulated SMS reply</Text>
                  <Text as="p" display="block" className={s.smsText}>Thumb payments are now LOCKED. Visit any Allied Bank branch with your CNIC to unlock.</Text>
                </figcaption>
              </figure>
              <ul className={s.protect}>
                {protections.map(([t, d, why]) => (
                  <li key={t} data-m="rise">
                    <Heading level={3} className={s.h3}>{t}</Heading>
                    <Text as="p" display="block" className={s.body}>{d}{why && <Text as="span" className={s.meta}>{why}</Text>}</Text>
                  </li>
                ))}
              </ul>
              <Text as="p" display="block" className={`${s.body} ${s.also}`}>A declined sale costs PKR 0. Every refund needs two different bank staff. Every change is written to a tamper-evident audit log.</Text>
              <aside className={s.launch}>
                <Heading level={3} className={s.h3}>What a real launch still needs</Heading>
                <ul>
                  <li>A certified scanner with liveness detection, tested to ISO/IEC 30107-3, with a false-match rate of 1 in 10,000 or better.</li>
                  <li>Above about 1,000 shoppers, matching by thumb alone gets less reliable. Production adds a second check that stays phone-free: the last 4 digits of a CNIC or phone typed at the till, or a second finger.</li>
                </ul>
              </aside>
            </section>
          </section>
        </section>

        {/* Every phone */}
        <section className={s.section} id="phones" aria-labelledby="phones-title">
          <section className={`${s.wrap} ${s.phonesGrid}`} aria-label="Works on any phone with SMS">
            <section className={s.phonesCopy} aria-label="SMS for everything after the sale">
              <Heading level={2} id="phones-title" className={`${s.display} ${s.h2}`}>No app, no data plan, no smartphone.</Heading>
              <Text as="p" display="block" className={s.lead}>Paying needs no phone at all. Everything after the sale comes by plain SMS, on any basic phone with SMS: no smartphone, no data plan.</Text>
              <Text as="p" display="block" className={s.body}>The receipt, decline alerts, Thumb Lock and disputes all arrive as text. To lock thumb payments, reply LOCK. To question a payment, reply DISPUTE to its receipt.</Text>
            </section>
            <figure className={s.phonesStage}>
              <Art className={s.phonesWash} src="/art/wash.webp" width={1400} height={542} alt="" depth={90} />
              <Art className={`${s.phonesStudent} ${s.cutout}`} src="/art/student.webp" width={344} height={770} alt="Bilal reads an SMS receipt on his old keypad phone." m="walk" />
              <span className={s.phone} aria-hidden="true">
                <Art className={s.cutout} src="/art/phone-stand.webp" width={381} height={650} alt="" />
                <span className={s.phoneScreen}><span className={s.dim}>1 new</span><span>message</span></span>
              </span>
              <figcaption className={torn(s.tornTb, s.sms)} data-m="sms">
                <Text as="span" className={s.tag}>Simulated SMS</Text>
                <Text as="p" display="block" className={s.smsText}>Allied Bank FingerPay: PKR 180.00 paid at Rasheed Kiryana Store via Raast Ref #RAAST-PK-…. Cashback Earned: PKR 3.60. Not you? Reply DISPUTE. Reply LOCK to block thumb payments.</Text>
              </figcaption>
            </figure>
          </section>
        </section>

        {/* Numbers */}
        <section className={s.section} id="numbers" aria-labelledby="numbers-title">
          <section className={`${s.wrap} ${s.numsGrid}`} aria-label="Figures">
            <header className={s.numsCopy}>
              <Heading level={2} id="numbers-title" className={`${s.display} ${s.h2}`}>The numbers behind one thumb tap.</Heading>
              <Text as="p" display="block" className={s.body}>Every figure comes from the prototype&apos;s spec, with its condition attached. Nothing here is a customer count or a market size.</Text>
            </header>
            <section className={torn(s.tornTb, s.receipt)} aria-label="Cash memo for the PKR 180 demo sale" data-m="receipt">
              <header className={s.receiptHead}>
                <Mark />
                <Text as="span" className={s.receiptName}>FingerPay</Text>
                <Text as="span" className={s.receiptSub}>Cash memo · Rasheed Kiryana Store · demo sale</Text>
              </header>
              <ul className={s.lines}>
                {numbers.map(([k, v, note]) => (
                  <li key={k} className={s.line}>
                    <span className={s.lineKey}>{k}</span><span className={s.lineValue}>{v}</span><span className={s.lineNote}>{note}</span>
                  </li>
                ))}
                <li className={s.total}><span className={s.lineKey}>What the shop gets from PKR 180</span><span className={`${s.lineValue} ${s.mono}`}>PKR 179.19</span></li>
              </ul>
              <Text as="span" className={s.receiptFoot}>Fee PKR 0.81 · computed in the database, half-up</Text>
            </section>
          </section>
        </section>
      </article>

      {/* Footer */}
      <footer className={`${s.footer} ${s.band}`} data-m="tear" id="disclaimer">
        <section className={`${s.wrap} ${s.footGrid}`} aria-label="About this prototype">
          <Text as="p" display="block" className={`${s.display} ${s.signoff}`} data-m="signoff">Shutter down. Nothing left to check.</Text>
          <figure className={s.footArt} aria-hidden="true">
            <Art className={s.cutout} src="/art/grocer-stand.webp" width={195} height={900} alt="" depth={-90} />
          </figure>
          <section className={s.footText} aria-label="Disclaimer">
            <Text as="p" display="block" className={s.body}>FingerPay is a student prototype. Allied Bank, NADRA and SBP Raast are proposed partners; all bank, identity and payment integrations shown are simulated. No real money or real biometric data is processed.</Text>
            <Text as="p" display="block" className={s.body}>Rasheed Ahmed, Ayesha Khan and Bilal Hussain are fictional demo personas.</Text>
            <Text as="p" display="block" className={s.body}><b>Real in this prototype:</b> the double-entry ledger, the Risk Engine&apos;s rules, encryption, request signing and the tamper-evident audit log, checked by automated database tests. <b>Simulated:</b> the thumb scanner, NADRA, Allied Bank accounts, Raast settlement and SMS delivery.</Text>
          </section>
          <section className={s.footBase} aria-label="Brand">
            <span className={s.brand}><Mark /><Art src="/brand/fingerpay-wordmark.svg" width={77} height={17} alt="FingerPay" /></span>
            <span>Making payments with one tap.</span>
            <span>© 2026 Team FingerPay</span>
          </section>
        </section>
      </footer>
    </main>
    </Theme>
  );
}
