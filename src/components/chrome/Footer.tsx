/**
 * SECTION 11 — Footer.
 *
 * The wake that has been running through the page arrives here and becomes
 * the footer's own geometry: the fan opens across the top edge, and the DUNA
 * wordmark sits on it like a hull on water. Editorial, not a four-column
 * corporate block — contact is given the weight it deserves because for a
 * six-figure hand-built boat the phone number *is* the conversion.
 */

import Link from "next/link";
import { CONTACT, LANGUAGES, LEGAL, NAV, SITE, SOCIALS } from "@/content/site";
import { WakeLine } from "@/components/primitives/WakeLine";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={`${styles.root} is-dark`} data-ground="dark">
      <WakeLine variant="field" origin={0.28} className={styles.wake} />

      <div className={styles.inner}>
        <div className={styles.lead}>
          <p className={`${styles.leadLabel} t-label`}>Duna Hajók — Győr, Hungary</p>
          <address className={styles.address}>
            <a href={CONTACT.phoneHref} className={styles.big}>
              {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`} className={styles.big}>
              {CONTACT.email}
            </a>
            <span className={styles.postal}>
              {CONTACT.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          </address>
        </div>

        <div className={styles.columns}>
          <nav className={styles.col} aria-label="Footer">
            <h2 className={`${styles.colTitle} t-label`}>Explore</h2>
            <ul>
              {NAV.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.col}>
            <h2 className={`${styles.colTitle} t-label`}>Suzuki Marine</h2>
            <ul>
              <li>
                <a href={`mailto:${CONTACT.suzuki.email}`}>{CONTACT.suzuki.email}</a>
              </li>
              {CONTACT.suzuki.phones.map((phone) => (
                <li key={phone}>
                  <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                </li>
              ))}
              <li className={styles.plain}>{CONTACT.suzuki.hours}</li>
            </ul>
          </div>

          <div className={styles.col}>
            <h2 className={`${styles.colTitle} t-label`}>Follow</h2>
            <ul>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h2 className={`${styles.colTitle} t-label`}>Language</h2>
            <ul className={styles.langList}>
              {LANGUAGES.map((l) => (
                <li key={l.code}>
                  <a
                    href={l.href}
                    hrefLang={l.code}
                    aria-current={l.code === SITE.locale ? "true" : undefined}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* The wordmark is decorative at this scale — the accessible name for
          the organisation is in the JSON-LD and the page heading. */}
      <p className={styles.wordmark} aria-hidden="true">
        {SITE.wordmark}
      </p>

      <div className={styles.base}>
        <p className={`${styles.copyright} t-label`}>
          © {new Date().getFullYear()} {CONTACT.company} — All rights reserved
        </p>
        <ul className={`${styles.legal} t-label`}>
          {LEGAL.map((item) => (
            <li key={item.label}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
