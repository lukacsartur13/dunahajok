import type { Metadata } from "next";
import { AWARDS } from "@/content/story";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import styles from "@/components/page/Page.module.css";
import awards from "./awards.module.css";

export const metadata: Metadata = pageMetadata({
  route: "awards",
  title: "Awards",
  description:
    "BIG SEE Product Design Award 2023, Budapest Boat Show Boat category II, and two selections for the Hungarian Design Award. Four recognitions for a yard of two boats.",
  image: "cabin-exterior",
});

/**
 * AWARDS — §B11.
 *
 * §B11 asks for editorial treatment rather than badge soup, and names the fields
 * each recognition should carry: year, award, product, context, image. Three of
 * those five are in the data; the fourth — context — is the `detail` string,
 * which on the source site is a paragraph rather than a caption and is treated
 * here as one. The fifth is deliberately absent, and that is the interesting
 * decision.
 *
 * THERE ARE NO AWARD IMAGES, so there are none on this page. The photography
 * library contains boats and a workshop; it contains no trophy, no certificate,
 * no ceremony and no jury. §B29 is explicit that a missing asset is better
 * solved with controlled layout than with generic stock, and an awards page
 * illustrated with somebody else's gala photograph would be the worst version
 * of the thing §B11 calls badge soup.
 *
 * So the page is typographic: four entries at display scale on generous white,
 * the year set as the largest element, and the whole thing readable in fifteen
 * seconds. §B11's real requirement is the last line — it should reinforce that
 * Duna is a design company that builds boats — and large type on empty paper
 * says that better than four logos would.
 *
 * THE ENTRY WITH NO YEAR. `story.ts` records an unresolved conflict on the
 * source site for the Kadét's Hungarian Design Award selection, and ships it
 * with `year: null`. It appears here, unnumbered, rather than being dropped or
 * guessed — the recognition is verified even though its date is not, and the
 * markup marks the missing year as absent rather than printing an em dash a
 * screen reader would read out.
 */
export default function AwardsPage() {
  return (
    <>
      <PageIntro
        route={ROUTES.awards}
        eyebrow="Four recognitions"
        section="Story"
        headline={["Design,", "recognised."]}
        lede="Four recognitions, from a yard that has built two boats of its own design."
        scale="inset"
        line="divider"
      />

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <Reveal as="ol" className={awards.list} stagger>
            {AWARDS.map((award) => (
              <li key={`${award.title}-${award.subject}`} className={awards.item}>
                <p className={awards.year} aria-hidden={award.year === null}>
                  {award.year ?? ""}
                </p>

                <div className={awards.body}>
                  <h2 className={`${awards.title} t-display`}>{award.title}</h2>
                  <p className={awards.subject}>
                    {award.subject}
                    <span className="t-slash" aria-hidden="true">/</span>
                    <span className={`${awards.result} t-label`}>{award.result}</span>
                  </p>
                  <p className={`${awards.detail} t-body`}>{award.detail}</p>
                  {award.year === null ? (
                    /* The source site contradicts itself about this date, in
                       two languages. Saying so is more useful than picking one
                       — and it is the sentence that gets removed the day the
                       client confirms which is correct. */
                    <p className={`${awards.note} t-label`}>
                      Year to be confirmed with the organisers
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>The boats themselves</h2>
            <p className="t-body">
              The BIG SEE went to the Cabin and the Budapest prize to the Kadét.
              Both are the same six-metre platform.
            </p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.boats.path} variant="primary">
                The range
              </ActionLink>
              <ActionLink href={ROUTES.heritage.path}>Heritage</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
