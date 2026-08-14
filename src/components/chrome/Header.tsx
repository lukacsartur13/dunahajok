"use client";

/**
 * Floating header.
 *
 * Two objects and nothing else: the wordmark, and the trigger. Everything
 * else lives in the overlay. It fades in only after the intro has released
 * the page, hides on scroll-down and returns on scroll-up, and inverts its
 * colour against whichever ground is behind it — read from the section's own
 * `data-ground` attribute rather than from hard-coded scroll offsets, so it
 * stays correct when sections are reordered.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, SITE } from "@/content/site";
import { useIntroReady } from "@/lib/intro";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { MenuOverlay } from "./MenuOverlay";
import styles from "./Header.module.css";

export function Header() {
  const ready = useIntroReady();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ground, setGround] = useState<"light" | "dark">("dark");
  const bar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  /* Hide going down, show coming back up. */
  useEffect(() => {
    const el = bar.current;
    if (!el || !ready) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 1.1, ease: "hull", delay: 0.15 },
      );

      ScrollTrigger.create({
        start: "top -80",
        end: 99999,
        onUpdate: ({ direction }) => {
          if (open) return;
          gsap.to(el, {
            yPercent: direction === 1 ? -140 : 0,
            duration: 0.55,
            ease: "hull",
            overwrite: true,
          });
        },
      });
    }, el);

    return () => ctx.revert();
  }, [ready, open]);

  /* Invert against the ground currently under the bar. */
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-ground]");
    if (!sections.length) return;

    const triggers = Array.from(sections).map((section) =>
      ScrollTrigger.create({
        trigger: section,
        start: "top 72px",
        end: "bottom 72px",
        onToggle: ({ isActive }) => {
          if (isActive) setGround(section.dataset.ground === "light" ? "light" : "dark");
        },
      }),
    );

    return () => triggers.forEach((t) => t.kill());
  }, []);

  /* Restore focus to the trigger when the overlay closes. */
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <>
      <header
        ref={bar}
        className={[styles.bar, styles[ground], open ? styles.overMenu : ""].join(" ")}
        data-cursor-solid=""
      >
        <Link href="/" className={styles.wordmark} aria-label={`${SITE.name} — home`}>
          <span aria-hidden="true">{SITE.wordmark}</span>
        </Link>

        {/* §B19 — THE TOP LEVEL, AND ONLY THE TOP LEVEL.
            Seven sections is more than a floating bar should carry at every
            width, so the desktop header shows them and the phone does not;
            everything deeper lives in the overlay, which is where §B19 says it
            belongs. The list is `NAV` rather than a second array, so a section
            cannot exist in one and not the other. */}
        <nav className={styles.links} aria-label="Sections">
          {NAV.map((item) => {
            const on =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href.split("#")[0].replace(/\/[^/]*$/, "")) &&
                  item.href.split("/")[1] === pathname.split("/")[1];
            return (
              <Link
                key={item.label}
                href={item.href}
                className={styles.link}
                data-on={on || undefined}
                aria-current={on ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          ref={trigger}
          type="button"
          className={styles.trigger}
          aria-expanded={open}
          aria-controls="duna-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`${styles.triggerLabel} t-label`}>{open ? "Close" : "Menu"}</span>
          <span className={styles.triggerMark} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </header>

      <MenuOverlay open={open} onClose={close} />
    </>
  );
}
