"use client";

/**
 * Full-screen editorial menu.
 *
 * Not a drawer. The overlay wipes down along the hull rake, the primary
 * navigation rises line by line, and hovering a primary entry brings up its
 * plate on the right. On mobile the plate is dropped and the same type scale
 * is re-set for a single column — it is designed for the phone, not squeezed
 * onto it.
 *
 * Accessibility: a real modal — aria-modal, Escape to close, focus moved in
 * on open and returned to the trigger on close, Tab cycled inside, background
 * scroll locked, and the whole thing inert to screen readers when shut.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CONTACT, LANGUAGES, NAV, SOCIALS } from "@/content/site";
import { MEDIA } from "@/lib/media.generated";
import { useScrollLock } from "@/lib/hooks";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { WakeLine } from "@/components/primitives/WakeLine";
import styles from "./MenuOverlay.module.css";

/**
 * §B20 — THE PLATE COMES FROM THE NAVIGATION ENTRY, NOT FROM A LOOKUP.
 *
 * Phase One kept a `Record<label, MediaId>` here, which worked while the labels
 * were English constants and breaks the moment they are translated — the lookup
 * would silently miss and every entry would show the same image. `NavNode.plate`
 * puts the image beside the destination it belongs to, in the same file, so a
 * new section arrives with its own plate or with none.
 */
const FALLBACK_PLATE = "hero-danube" as const;

function plateFor(id: string | undefined): (typeof MEDIA)[keyof typeof MEDIA] {
  return MEDIA[(id ?? FALLBACK_PLATE) as keyof typeof MEDIA] ?? MEDIA[FALLBACK_PLATE];
}

interface MenuOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function MenuOverlay({ open, onClose }: MenuOverlayProps) {
  const root = useRef<HTMLDivElement>(null);
  const hasOpened = useRef(false);
  const [active, setActive] = useState<string | undefined>(NAV[0]?.plate);

  useScrollLock(open);

  /* Enter / exit. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const lines = el.querySelectorAll<HTMLElement>(".js-menu-line > span");
    const rest = el.querySelectorAll<HTMLElement>("[data-menu-fade]");
    const reduced = prefersReducedMotion();

    // The closed state on first mount is set, not tweened. Tweening it meant
    // an exit animation was still in flight the first time the menu opened,
    // and its onComplete re-hid the navigation behind the enter animation.
    if (!open && !hasOpened.current) {
      gsap.set(el, { pointerEvents: "none", clipPath: "polygon(0 0,100% 0,100% 0%,0 0%)" });
      gsap.set(lines, { yPercent: 112 });
      gsap.set(rest, { opacity: 0 });
      return;
    }
    if (open) hasOpened.current = true;

    const ctx = gsap.context(() => {
      if (open) {
        gsap.set(el, { pointerEvents: "auto" });
        if (reduced) {
          gsap.set(el, { opacity: 1, clipPath: "polygon(0 0,100% 0,100% 100%,0 100%)" });
          gsap.set([lines, rest], { opacity: 1, yPercent: 0 });
          return;
        }
        gsap
          .timeline()
          .fromTo(
            el,
            { clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)" },
            {
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
              duration: 0.95,
              ease: "hull",
            },
          )
          .fromTo(
            lines,
            { yPercent: 112 },
            { yPercent: 0, duration: 1, ease: "hull", stagger: 0.05 },
            0.28,
          )
          .fromTo(rest, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.04 }, 0.5);
      } else {
        if (reduced) {
          gsap.set(el, { opacity: 0, pointerEvents: "none" });
          return;
        }
        gsap.to(el, {
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)",
          duration: 0.6,
          ease: "hull",
          onComplete: () => {
            gsap.set(el, { pointerEvents: "none" });
            gsap.set(lines, { yPercent: 112 });
            gsap.set(rest, { opacity: 0 });
          },
        });
      }
    }, el);

    return () => ctx.revert();
  }, [open]);

  /* Escape, focus move-in, focus trap. */
  useEffect(() => {
    if (!open) return;
    const el = root.current;
    if (!el) return;

    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => n.offsetParent !== null);

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const plate = plateFor(active);

  return (
    <div
      ref={root}
      id="duna-menu"
      className={`${styles.root} is-dark`}
      // Hidden from assistive tech and from tab order when shut.
      {...(open
        ? { role: "dialog" as const, "aria-modal": true, "aria-label": "Main menu" }
        : { inert: true })}
    >
      <div className={styles.inner}>
        <nav className={styles.primary} aria-label="Main">
          <ul>
            {NAV.map((item) => (
              <li key={item.label} className={styles.primaryItem}>
                <Link
                  href={item.href}
                  className={styles.primaryLink}
                  onClick={onClose}
                  onPointerEnter={() => setActive(item.plate)}
                  onFocus={() => setActive(item.plate)}
                >
                  <span className={`${styles.primaryIndex} t-label`} aria-hidden="true">
                    {item.index}
                  </span>
                  <span className={`${styles.primaryLine} js-menu-line`}>
                    <span>{item.label}</span>
                  </span>
                </Link>

                {item.children ? (
                  <ul className={styles.secondary} data-menu-fade>
                    {item.children.map((child) => (
                      <li key={child.label}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          className={styles.secondaryLink}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.aside}>
          <div className={styles.plate} data-menu-fade aria-hidden="true">
            {/* Not next/image: this swaps on hover and must not queue a new
                optimizer request mid-interaction. All plates are preloaded
                once the overlay opens. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={plate.src} alt="" width={plate.width} height={plate.height} loading="lazy" />
          </div>

          <div className={styles.contact} data-menu-fade>
            <p className={`${styles.contactLabel} t-label`}>Duna Hajók — Győr</p>
            <address className={styles.address}>
              {CONTACT.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <p className={styles.contactLinks}>
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </p>
          </div>

          <div className={styles.meta} data-menu-fade>
            <ul className={styles.socials}>
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer noopener">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className={styles.langs} aria-label="Language">
              {LANGUAGES.map((l) => (
                <li key={l.code}>
                  <a
                    href={l.href}
                    hrefLang={l.code}
                    aria-current={l.code === "en" ? "true" : undefined}
                    className={l.code === "en" ? styles.langCurrent : undefined}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <WakeLine variant="field" origin={0.62} animate={false} className={styles.wake} />
    </div>
  );
}
