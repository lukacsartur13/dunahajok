"use client";

/**
 * SECTION 00 — Preloader.
 *
 * Still water, then a disturbance, then the wake.
 *
 * A single hairline spans the viewport. A travelling gaussian bump moves along
 * it — the first sign that something is moving out there. When the critical
 * assets are in, the line splits into a wake pair, opens, and the panel wipes
 * away along the hull rake.
 *
 * The duration is honest: it is the time the hero image and the display face
 * actually take, floored at a very short minimum so the animation isn't a
 * stutter, and capped so a slow connection never traps anyone. There is no
 * padded fake progress.
 *
 * Returning visitors within the same session get the short form.
 * prefers-reduced-motion skips the sequence and simply cross-fades.
 *
 * IT DOES NOT RUN ON AN IMMERSIVE PRODUCT ROUTE. The sequence waits on the
 * homepage's hero photograph, which is the right thing to wait for on the
 * homepage and the wrong thing entirely on a link straight into the PXL
 * configurator: the visitor would wait a second for an asset that page never
 * shows, behind a full-screen panel — which is precisely the "black flash over
 * an empty background" Phase Three §57 rules out. Those routes compose
 * themselves from their own fallback render instead.
 */

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { isImmersiveRoute } from "@/content/publication";
import { MEDIA } from "@/lib/media.generated";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { isReturningVisitor, markIntroComplete, markVisited } from "@/lib/intro";
import styles from "./Preloader.module.css";

const WIDTH = 1000;
const HEIGHT = 120;
const MID = HEIGHT / 2;
const HARD_CAP_MS = 4500;

/** A still line carrying one travelling disturbance, sampled to an SVG path. */
function disturbedPath(centre: number, amplitude: number): string {
  const points: string[] = [];
  for (let x = 0; x <= WIDTH; x += 10) {
    const d = (x - centre) / 74;
    // Gaussian envelope × one cycle, so the bump has a trough on each side —
    // the cross-section of a real wake, not a lump.
    const y = MID - Math.exp(-d * d) * Math.sin(d * 1.9) * amplitude;
    points.push(`${x} ${y.toFixed(2)}`);
  }
  return `M${points.join(" L")}`;
}

export function Preloader() {
  const pathname = usePathname();
  const skip = isImmersiveRoute(pathname ?? "");
  const [dismissed, setDismissed] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<SVGPathElement>(null);
  const wakeA = useRef<SVGPathElement>(null);
  const wakeB = useRef<SVGPathElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const finished = useRef(false);

  /** Play the release, then unmount. */
  const release = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    markVisited();

    const el = root.current;
    const reduced = prefersReducedMotion();

    if (!el || reduced) {
      markIntroComplete();
      setDismissed(true);
      return;
    }

    const finish = () => {
      markIntroComplete();
      setDismissed(true);
    };

    // Safety net. If the page was loaded into a background tab, rAF is
    // throttled and this timeline may not advance until the visitor returns.
    // A stranded black overlay is the worst possible failure here, so the
    // release is also committed on a plain timer.
    window.setTimeout(finish, 2600);

    const tl = gsap.timeline({ onComplete: finish });

    tl.to(counter.current, { opacity: 0, duration: 0.3, ease: "power2.out" }, 0)
      // The single line becomes two, and they diverge: the wake opens.
      .to(line.current, { opacity: 0, duration: 0.35 }, 0.1)
      .fromTo(
        [wakeA.current, wakeB.current],
        { opacity: 0, scaleY: 0 },
        { opacity: 1, scaleY: 1, duration: 0.9, ease: "hull", transformOrigin: "center" },
        0.12,
      )
      .to(
        el,
        {
          // Wipe up, raked. The hero is already painted underneath.
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 6vw)",
          duration: 1.1,
          ease: "hull",
        },
        0.55,
      )
      .to([wakeA.current, wakeB.current], { opacity: 0, duration: 0.45 }, 0.75);
  }, []);

  useEffect(() => {
    if (skip) {
      // Hand the page over immediately. The flag still has to be set, because
      // the header and the hero both wait on it.
      markIntroComplete();
      return;
    }
    const el = root.current;
    if (!el) return;

    document.documentElement.dataset.intro = "running";
    const short = isReturningVisitor();
    const floor = short ? 420 : 1000;
    const started = performance.now();

    /* ── Honest progress ──────────────────────────────────────────────── */
    let progress = 0;
    const setProgress = (value: number) => {
      progress = Math.max(progress, Math.min(1, value));
      if (counter.current) {
        counter.current.textContent = String(Math.round(progress * 100)).padStart(3, "0");
      }
    };

    const steps: Array<Promise<unknown>> = [
      // The display face — headline metrics must be settled before the reveal.
      document.fonts?.ready ?? Promise.resolve(),
      // The hero plate itself.
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = MEDIA["hero-danube"].src;
      }),
    ];

    let done = 0;
    steps.forEach((step) =>
      step.then(() => {
        done += 1;
        setProgress(done / steps.length);
      }),
    );

    /* ── The disturbance ──────────────────────────────────────────────── */
    let raf = 0;
    const reduced = prefersReducedMotion();

    if (!reduced && line.current) {
      const path = line.current;
      const draw = (time: number) => {
        const t = (time - started) / 1000;
        // One slow pass across the line, easing as it travels.
        const centre = ((t * 0.42) % 1.35) * WIDTH * 1.05 - WIDTH * 0.05;
        path.setAttribute("d", disturbedPath(centre, 13));
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    } else if (line.current) {
      line.current.setAttribute("d", `M0 ${MID} L${WIDTH} ${MID}`);
    }

    /* ── Release ──────────────────────────────────────────────────────── */
    const settle = () => {
      const elapsed = performance.now() - started;
      const wait = Math.max(0, floor - elapsed);
      window.setTimeout(() => {
        setProgress(1);
        cancelAnimationFrame(raf);
        release();
      }, wait);
    };

    Promise.all(steps).then(settle);
    const cap = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      setProgress(1);
      release();
    }, HARD_CAP_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(cap);
    };
  }, [release, skip]);

  if (skip || dismissed) return null;

  return (
    <div ref={root} className={styles.root} role="status" aria-live="polite">
      <span className="u-sr">Loading Duna</span>

      <div className={styles.head} aria-hidden="true">
        <span className={styles.mark}>DUNA</span>
        <span className={styles.counter}>
          <span ref={counter}>000</span>
        </span>
      </div>

      <svg
        className={styles.water}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path ref={line} className={styles.line} d={`M0 ${MID} L${WIDTH} ${MID}`} />
        <path
          ref={wakeA}
          className={styles.wake}
          d={`M0 ${MID} C ${WIDTH * 0.45} ${MID} ${WIDTH * 0.7} ${MID + 6} ${WIDTH} ${MID + 44}`}
        />
        <path
          ref={wakeB}
          className={styles.wake}
          d={`M0 ${MID} C ${WIDTH * 0.45} ${MID} ${WIDTH * 0.7} ${MID - 6} ${WIDTH} ${MID - 44}`}
        />
      </svg>

      <span className={styles.foot} aria-hidden="true">
        Hungarian boatbuilding since 1991
      </span>
    </div>
  );
}
