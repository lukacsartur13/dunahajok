import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JOURNAL, findArticle } from "@/content/editorial";
import { ROUTES } from "@/content/routes";
import { SITE } from "@/content/site";
import { MEDIA } from "@/lib/media.generated";
import { PageIntro } from "@/components/page/PageIntro";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

/**
 * §B16's article template. Complete, and currently NOT A ROUTE.
 *
 * ── WHY THIS FOLDER IS `_article-template` AND NOT `[slug]` ────────────────
 *
 * `JOURNAL` is an empty array, deliberately: §33 says the journal has no
 * verified content and forbids inventing any to stand in for it. So
 * `generateStaticParams()` below returns `[]` — and Next 15 rejects a dynamic
 * route that produces no params under `output: export`:
 *
 *   Page "/journal/[slug]" is missing "generateStaticParams()" so it cannot
 *   be used with "output: export" config.
 *
 * The message is misleading — the function is right there — but the rule is
 * real: a statically exported site cannot carry a route with nothing to export.
 * This broke the GitHub Pages deploy, and only there, because `output: export`
 * is switched on by `GITHUB_PAGES` and an ordinary `next build` never
 * exercises it.
 *
 * The three ways out were: delete the template, invent a placeholder article,
 * or stop routing it. Inventing one is out — that is exactly what §33 forbids,
 * and a fabricated slug would have been a real URL on the live site. Deleting
 * it throws away finished work for a reason that expires the moment the yard
 * supplies one article.
 *
 * A leading underscore makes this a Next PRIVATE FOLDER: it and everything
 * under it are opted out of routing, while the file stays here beside the
 * section it belongs to and stays under `tsc`. **To publish the journal, add
 * articles to `JOURNAL` and rename this folder back to `[slug]`.** Nothing else
 * changes.
 *
 * `Article` structured data is emitted here rather than in a shared component
 * because it is the one schema on the site whose required fields — headline,
 * datePublished, image — are all article-specific. §B25 asks for structured
 * data "where appropriate"; an article is the clearest case there is, and the
 * markup is generated from the same object that renders the page, so the two
 * cannot disagree.
 */
export function generateStaticParams() {
  return JOURNAL.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) return { title: "Journal" };
  return {
    title: article.title,
    description: article.standfirst,
    alternates: { canonical: `${ROUTES.journal.path}/${article.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE.name,
      title: `${article.title} — ${SITE.name}`,
      description: article.standfirst,
      publishedTime: article.date,
      images: [{ url: MEDIA[article.hero].src }],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = findArticle(slug);
  if (!article) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.standfirst,
    datePublished: article.date,
    image: `${SITE.url}${MEDIA[article.hero].src}`,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: `${SITE.url}${ROUTES.journal.path}/${article.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <PageIntro
        route={ROUTES.journal}
        eyebrow={article.category}
        section="Journal"
        headline={[article.title]}
        lede={article.standfirst}
        media={article.hero}
        scale="wide"
        line="divider"
      />

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <p className="t-label">
            <time dateTime={article.date}>
              {new Date(article.date).toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </p>
          <Reveal className={styles.prose} stagger>
            {article.body.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="t-body">
                {paragraph}
              </p>
            ))}
          </Reveal>
        </div>
      </section>

      {article.gallery?.length ? (
        <section className={`${styles.section} is-light`} data-ground="light">
          <Reveal className={styles.gallery} stagger>
            {article.gallery.map((id) => (
              <CinematicMedia key={id} id={id} ratio="4 / 5" sizes="33vw" />
            ))}
          </Reveal>
        </section>
      ) : null}

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.actions}>
            <ActionLink href={ROUTES.journal.path} variant="primary">
              All journal entries
            </ActionLink>
          </div>
        </div>
      </section>
    </>
  );
}
