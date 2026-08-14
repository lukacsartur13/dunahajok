"use client";

/**
 * THE OPENING OF EVERY INTERIOR PAGE.
 *
 * §B22 asks that every page belong to Duna without every page looking
 * identical, and that the difference come from emphasis rather than from a
 * second design system. This component is where that decision is enforced
 * rather than encouraged: there is ONE opening, every route uses it, and the
 * only thing that varies is the `tone` the route declares in `content/routes`.
 *
 * WHAT THE TONE ACTUALLY CHANGES:
 *
 *   paper      the light ground, hairlines, generous white space. Overview and
 *              index pages, where the job is to let the visitor choose.
 *   depth      the river-dark ground. Kadét, Manufacturing, Contact — pages
 *              whose subject is the water or the workshop rather than the
 *              object.
 *   warm       the ground pulled toward the timber. Cabin and Materials.
 *   technical  paper with the mono annotations promoted and the type set
 *              tighter. Design and Suzuki Marine.
 *   archival   paper, sunk, with the rule set above the headline rather than
 *              beside it. Heritage.
 *
 * It changes a ground, a rule and a type weight. It does not change the
 * typeface, the scale, the rake or the motion curve, because those are the
 * design system and §B22 is explicit that the system itself does not change.
 *
 * THE WAKE, INTERPRETED — §B23. Every page carries one line at its opening and
 * it is never the same drawing twice: on a product page it is the hull's own
 * profile line, on Heritage it is the timeline's spine, on Craft it is a
 * construction line, and on an index it is the divider. `line` says which.
 */

import type { ReactNode } from "react";
import { DisplayLines } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { WakeLine } from "@/components/primitives/WakeLine";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import type { MediaId } from "@/lib/media.generated";
import type { RouteSpec } from "@/content/routes";
import styles from "./Page.module.css";

export type PageLine = "divider" | "profile" | "construction" | "timeline" | "none";

interface PageIntroProps {
  route: RouteSpec;
  /**
   * The mono line above the headline.
   *
   * Never a repeat of the headline, and never a repeat of `section` either —
   * the two are printed together as "SECTION / EYEBROW", so an eyebrow of
   * "Story — Awards" under a section of "Story" renders "STORY / STORY —
   * AWARDS". It is the kind of thing that only shows up when the page is
   * actually looked at, which is why it is written down here.
   */
  eyebrow: string;
  /** Broken where it should break. Set as display type, one line per entry. */
  headline: readonly string[];
  lede?: string;
  /** The opening image. Omitted on pages whose first statement is typographic. */
  media?: MediaId;
  /** How tall the opening image stands. Product pages take the full viewport. */
  scale?: "full" | "wide" | "inset";
  line?: PageLine;
  /** Breadcrumb-ish section name, e.g. "Craft". Sits beside the eyebrow. */
  section?: string;
  children?: ReactNode;
}

export function PageIntro({
  route,
  eyebrow,
  headline,
  lede,
  media,
  scale = "wide",
  line = "divider",
  section,
  children,
}: PageIntroProps) {
  const dark = route.tone === "depth";

  return (
    <header
      className={`${styles.intro} ${dark ? "is-dark" : "is-light"}`}
      data-tone={route.tone}
      data-scale={scale}
      // Read by the floating header, which inverts against whatever ground is
      // under it. Declared on the section rather than computed from a scroll
      // offset, so it stays correct when sections are reordered.
      data-ground={dark ? "dark" : "light"}
    >
      {/* THE ATTRIBUTE GOES ON A WRAPPER, NOT ON THE COMPONENT.
          `WakeLine` declares four props and passes none of them through to its
          `<svg>`, so a `data-line` handed straight to it is silently dropped —
          and the §B23 interpretations below it would never match anything. The
          wrapper is one element and it makes the positioning explicit rather
          than dependent on a primitive's prop spreading. */}
      {line !== "none" ? (
        <div className={styles.introWake} data-line={line} aria-hidden="true">
          <WakeLine
            variant={dark ? "field" : "quiet"}
            origin={line === "profile" ? 0.18 : 0.72}
          />
        </div>
      ) : null}

      <div className={styles.introInner}>
        <div className={styles.introHead}>
          <p className={`${styles.eyebrow} t-label`}>
            {section ? (
              <>
                <span className={styles.eyebrowSection}>{section}</span>
                <span className="t-slash" aria-hidden="true">
                  /
                </span>
              </>
            ) : null}
            {eyebrow}
          </p>

          {/* §B25 — THE PAGE'S ONE `h1`.
              `DisplayLines` defaults to `h2`, which is right for a section
              headline on the homepage and wrong here: this IS the page's
              heading, and a route whose largest type is an `h2` is a route
              with no `h1` at all. The audit that found it was a sweep of all
              fourteen routes counting headings, which is worth doing again
              whenever a page type is added — it is invisible in every
              screenshot. */}
          <DisplayLines
            as="h1"
            size={scale === "full" ? "d1" : "d2"}
            lines={[...headline]}
            className={styles.headline}
          />

          {lede ? (
            <Reveal delay={0.12}>
              <p className={`${styles.lede} t-lead`}>{lede}</p>
            </Reveal>
          ) : null}

          {children ? <Reveal delay={0.2}>{children}</Reveal> : null}
        </div>
      </div>

      {media ? (
        <div className={styles.introMedia}>
          <CinematicMedia
            id={media}
            priority
            sizes="100vw"
            ratio={scale === "full" ? "16 / 9" : "21 / 9"}
            cut={scale === "full" ? "bottom" : "both"}
            scrim={dark ? 0.3 : 0}
          />
        </div>
      ) : null}
    </header>
  );
}
