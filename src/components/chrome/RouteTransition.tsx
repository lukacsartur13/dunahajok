"use client";

/**
 * THE ROUTE TRANSITION — §B21.
 *
 * §B21 asks for a coherent Duna transition, suggests the wake line and the
 * raked mask as motifs, sets a target of roughly 400–800 ms, and warns against
 * a two-second animation on every click and against breaking back/forward.
 *
 * ── WHAT THIS IS ───────────────────────────────────────────────────────────
 *
 * A raked veil that sweeps ACROSS the viewport once, at the Duna Line's own
 * angle, when the pathname changes. 560 ms end to end: 240 ms to cover, a
 * 60 ms hold while the new route paints, 260 ms to uncover. It is the same
 * geometry as the fullscreen menu's own wipe, which is the point — the site has
 * one way of covering itself and this is it.
 *
 * ── WHAT IT DELIBERATELY IS NOT ────────────────────────────────────────────
 *
 * NOT A CONTENT-BLOCKING TRANSITION. The veil is `position: fixed`,
 * `pointer-events: none`, and `aria-hidden`. The new page is mounted, painted
 * and interactive underneath it the whole time; the veil is a visual event, not
 * a gate. That is what keeps §B21's "back/forward must remain responsive" true
 * by construction rather than by testing — the browser's own navigation is
 * never waiting on an animation, because nothing here can hold it up.
 *
 * NOT A SCROLL RESTORATION HANDLER. Next and the browser already own that
 * between them, and a transition that also decides where the page starts is a
 * transition that fights the back button.
 *
 * NOT ON THE FIRST PAINT. The preloader owns the arrival; running a route
 * transition on top of it would be two curtains for one entrance. `previous`
 * starts as the current path, so the effect's first run does nothing.
 *
 * NOT ON THE IMMERSIVE ROUTES. The configurator composes its own entrance from
 * a veil the previous route left up (see `pxlEntry`), and a second veil over
 * the top of it would be a double fade on the one route that has been most
 * carefully choreographed.
 *
 * ── REDUCED MOTION ─────────────────────────────────────────────────────────
 *
 * Nothing. No fade, no veil, no delay — the new page is simply there. A route
 * change is navigation, not decoration, and the honest response to a request
 * for less motion is to stop moving rather than to move more slowly.
 */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isImmersiveRoute } from "@/content/publication";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import styles from "./RouteTransition.module.css";

/** Cover, hold, uncover. 560 ms in total — inside §B21's 400–800 ms. */
const COVER = 0.24;
const HOLD = 0.06;
const UNCOVER = 0.26;

export function RouteTransition() {
  const pathname = usePathname();
  const veil = useRef<HTMLDivElement>(null);
  const previous = useRef(pathname);

  useEffect(() => {
    const el = veil.current;
    if (!el) return;
    if (previous.current === pathname) return;

    const from = previous.current;
    previous.current = pathname;

    if (prefersReducedMotion()) return;
    // Either end of the navigation being immersive means the configurator is
    // running its own choreography. Leaving and entering both count.
    if (isImmersiveRoute(pathname) || isImmersiveRoute(from)) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .set(el, { display: "block" })
        .fromTo(
          el,
          // The raked edge: the veil's leading boundary runs ahead at the top
          // by the hull angle, so it crosses the frame as a line rather than as
          // a rectangle. The same polygon language as MenuOverlay's wipe.
          { clipPath: "polygon(-16% 0, 0 0, -16% 100%, -32% 100%)" },
          {
            clipPath: "polygon(-16% 0, 116% 0, 100% 100%, -32% 100%)",
            duration: COVER,
            ease: "power2.in",
          },
        )
        .to(
          el,
          {
            clipPath: "polygon(116% 0, 132% 0, 116% 100%, 100% 100%)",
            duration: UNCOVER,
            ease: "power2.out",
          },
          `+=${HOLD}`,
        )
        .set(el, { display: "none" });
    }, el);

    return () => ctx.revert();
  }, [pathname]);

  return <div ref={veil} className={styles.veil} aria-hidden="true" />;
}
