/**
 * THE CRAFT PAGES, RENDERED.
 *
 * Three routes, one component, and the differences between them carried
 * entirely by the data in `content/craft.ts` plus the tone in `content/routes`.
 * §B22 asks that pages differ by emphasis rather than by design system, and
 * this is the strictest reading of it: Design, Manufacturing and Materials do
 * not share a *look*, they share an *implementation*, and what makes them
 * distinguishable is the ground, the number of movements, how many bleed, and
 * whether they carry annotations.
 *
 * Design has five movements, two of them full-bleed, three annotations each,
 * on the sunk paper ground. Manufacturing has three, two bleeding, on the
 * river-dark. Materials has none at all — it renders a macro sequence instead,
 * because §B9 asks for large macros and minimal copy, and a page of movements
 * with one sentence in each is a page of headings.
 *
 * A server component. There is nothing interactive here that the primitives do
 * not already own, so nothing in this file needs to reach the browser.
 */

import Link from "next/link";
import type { CraftPage } from "@/content/craft";
import { CRAFT_PAGES } from "@/content/craft";
import type { RouteSpec } from "@/content/routes";
import { PageIntro } from "@/components/page/PageIntro";
import { Movement } from "@/components/page/Movement";
import styles from "@/components/page/Page.module.css";
import craft from "./CraftPageView.module.css";

interface CraftPageViewProps {
  route: RouteSpec;
  page: CraftPage;
  /** Which of the three is open. Drives the section navigation's current state. */
  current: (typeof CRAFT_PAGES)[number]["id"];
  children?: React.ReactNode;
}

export function CraftPageView({ route, page, current, children }: CraftPageViewProps) {
  return (
    <>
      <PageIntro
        route={route}
        eyebrow={page.eyebrow}
        section="Craft"
        headline={page.headline}
        lede={page.lede}
        media={page.hero}
        scale="wide"
        line="construction"
      >
        {/* §B19: the section's own navigation, on the page rather than only in
            the menu. Three pages is small enough that a visitor who has landed
            on one should be able to see the other two without opening
            anything. */}
        <nav className={craft.sectionNav} aria-label="Craft">
          {CRAFT_PAGES.map(({ id, label, page: target }) => {
            const href = `/craft/${id}`;
            const on = id === current;
            return (
              <Link
                key={id}
                href={href}
                className={craft.sectionLink}
                data-on={on || undefined}
                aria-current={on ? "page" : undefined}
                title={target.lede}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </PageIntro>

      {page.movements.length ? (
        <div className={styles.movements}>
          {page.movements.map((movement, index) => (
            <Movement
              key={movement.id}
              id={movement.id}
              index={movement.index}
              eyebrow={movement.eyebrow}
              title={movement.title}
              lede={movement.lede}
              body={movement.body}
              media={movement.media}
              bleed={movement.bleed}
              annotations={movement.annotations}
              // Alternating from the left. Craft is explanatory rather than
              // sporting, so it reads in the composed direction.
              side={index % 2 === 0 ? "left" : "right"}
            />
          ))}
        </div>
      ) : null}

      {children}
    </>
  );
}
