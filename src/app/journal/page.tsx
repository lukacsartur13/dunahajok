import type { Metadata } from "next";
import { JOURNAL_NOTICE, journalByDate } from "@/content/editorial";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "journal",
  title: "Journal",
  description:
    "Build notes, boat shows and the work of the yard at Győr. The Duna Hajók journal is in preparation.",
});

/**
 * JOURNAL — §B16.
 *
 * §B16 asks for a journal ARCHITECTURE — an index and an article template —
 * "even if content volume is initially small", and says not to fabricate
 * articles to fill it. Small here is zero, and the two halves of that
 * instruction are both honoured: the architecture is complete and the array is
 * empty.
 *
 * WHAT IS ACTUALLY BUILT. The index sorts by date, groups nothing (there is
 * nothing to group), and renders each entry with its category, date, standfirst
 * and plate. `journal/[slug]` renders the article with `Article` structured
 * data and its own OpenGraph. The category vocabulary is a union of five, so an
 * editor cannot invent a sixth by typing it. Publishing the first post is
 * adding an object to `JOURNAL` in `content/editorial.ts` — no component, no
 * route and no metadata has to be written on the day.
 *
 * The empty state is a statement rather than a spinner, and it says the true
 * thing: nothing has been published, and nothing has been invented to stand in
 * for it.
 */
export default function JournalPage() {
  const articles = journalByDate();

  return (
    <>
      <PageIntro
        route={ROUTES.journal}
        eyebrow="Notes from the yard"
        section="Journal"
        headline={["From the", "workshop."]}
        lede="Build notes, boat shows, and what the yard at Győr is working on."
        scale="inset"
        line="divider"
      />

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          {articles.length ? (
            <Reveal className={styles.grid} stagger>
              {articles.map((article) => (
                <article key={article.slug} className={styles.card}>
                  <CinematicMedia id={article.hero} ratio="3 / 2" sizes="33vw" />
                  <p className="t-label">
                    {article.category}
                    <span className="t-slash" aria-hidden="true">/</span>
                    <time dateTime={article.date}>
                      {new Date(article.date).toLocaleDateString("en-GB", {
                        year: "numeric",
                        month: "long",
                      })}
                    </time>
                  </p>
                  <h2 className={`${styles.cardTitle} t-display`}>{article.title}</h2>
                  <p className={`${styles.cardBody} t-body`}>{article.standfirst}</p>
                  <ActionLink href={`${ROUTES.journal.path}/${article.slug}`}>
                    Read
                  </ActionLink>
                </article>
              ))}
            </Reveal>
          ) : (
            <div className={styles.notice}>
              <h2 className={`${styles.noticeHeading} t-display`}>{JOURNAL_NOTICE.heading}</h2>
              <p className="t-body">{JOURNAL_NOTICE.body}</p>
              <div className={styles.actions}>
                <ActionLink href={ROUTES.craftManufacturing.path} variant="primary">
                  See the workshop
                </ActionLink>
                <ActionLink href={ROUTES.contact.path}>Contact the yard</ActionLink>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
