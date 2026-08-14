import type { Metadata } from "next";
import { MILESTONES } from "@/content/story";
import { ROUTES } from "@/content/routes";
import { SITE } from "@/content/site";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { ActionLink } from "@/components/primitives/ActionLink";
import { HeritageChronicle } from "./HeritageChronicle";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "heritage",
  title: "Heritage",
  description:
    "From a 1991 joinery workshop on the Danube to the BIG SEE Product Design Award in 2023. Five dates in the history of Duna Enterior Kft. and the boats it now builds in Győr.",
  image: "heritage-steamer",
});

/**
 * HERITAGE — §B10.
 *
 * §B10 asks that this go DEEPER than the homepage timeline rather than copying
 * it, and the difference is not length — it is what the page is able to do that
 * a homepage section cannot.
 *
 * The homepage's `Timeline` is a scroll-driven rule with five stops on it: a
 * summary, seen in passing, on the way to something else. This page is a
 * chronicle. Each date gets its own band, its own image at a size the homepage
 * cannot afford, and the surrounding fact that explains WHY the step was taken
 * — the joinery that came before 2016, the electric drive that 2020 actually
 * delivered, the gap in the region that 2022 filled.
 *
 * EVERY DATE IS VERIFIED, and the one that is not is absent. `story.ts` records
 * an unresolved conflict on the source site: the awards page heads a section
 * "Hungarian Design Award 2023" while its body says the Kadét was entered "in
 * 2020", and the German page repeats the contradiction. That entry therefore
 * carries `year: null` in the data and does not appear on this timeline at all
 * — a chronicle is the one page where a date that might be wrong cannot be
 * quietly included. It appears on the Awards page instead, without a year.
 */
export default function HeritagePage() {
  return (
    <>
      <PageIntro
        route={ROUTES.heritage}
        eyebrow="Since 1991"
        section="Story"
        headline={["Thirty years", "on one river."]}
        lede={`${SITE.name} was a joinery workshop for twenty-five years before it was a boatyard. That order is the reason the boats are made the way they are.`}
        media="heritage-steamer"
        scale="wide"
        line="timeline"
      />

      <HeritageChronicle milestones={MILESTONES} />

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>Since then</h2>
            <p className="t-body">
              The workshop in Győr still builds every boat by hand, and still
              does the joinery and renovation work it started with in 1991.
            </p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.awards.path} variant="primary">
                Awards
              </ActionLink>
              <ActionLink href={ROUTES.craftManufacturing.path}>The workshop</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
