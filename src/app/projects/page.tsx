import type { Metadata } from "next";
import { PROJECTS, PROJECT_CAPABILITIES, PROJECTS_NOTICE } from "@/content/editorial";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "projects",
  title: "Projects",
  description:
    "Shipbuilding, ship renovation, marine joinery and Suzuki engine service — the work Duna Enterior Kft. has done from its Győr workshop since 1991, alongside its own boats.",
  image: "gyor-boat-trailer",
});

/**
 * PROJECTS — §B14, and the hardest editorial decision in this phase.
 *
 * §B14 asks for a Projects area, insists that only VERIFIED projects appear,
 * and says in as many words: do not create empty cards. Those three together
 * have exactly one honest resolution, because nothing verified exists.
 *
 * The source site publishes the company's history, its two boats, its awards
 * and its Suzuki dealership. It does not publish a project archive, a
 * restoration case study, a client list or a single dated commission. What it
 * DOES establish — clearly, in the company history, in two languages — is that
 * the business has done shipbuilding and ship renovation since 1991.
 *
 * So this page is about the capability, which is verified, and says plainly
 * that individual commissions have not been published, which is also true. It
 * is not a grid of three invented restorations; it is not a "coming soon"; and
 * it is not a page that pretends the section is finished.
 *
 * THE CASE-STUDY ARCHITECTURE IS BUILT AND EMPTY. `PROJECTS` is a typed array
 * with zero entries, `projects/[slug]` renders §B15's full template, and the
 * grid below maps over the array — so publishing the first case study is adding
 * an object to `content/editorial.ts`. The `PROJECTS.length` branch is not
 * defensive: it is the difference between a page that will grow into itself and
 * a page somebody has to rebuild.
 */
export default function ProjectsPage() {
  return (
    <>
      <PageIntro
        route={ROUTES.projects}
        eyebrow="Marine work since 1991"
        section="Projects"
        headline={["Boats we did not", "design ourselves."]}
        lede="Duna Enterior Kft. has built and renovated vessels since 1991 — a quarter of a century before it drew a hull of its own."
        media="gyor-boat-trailer"
        scale="wide"
        line="divider"
      />

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">What the workshop does</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Four kinds of work</h2>
          </div>

          <Reveal className={styles.grid} stagger>
            {PROJECT_CAPABILITIES.map((capability) => (
              <article key={capability.id} className={styles.card}>
                <h3 className={`${styles.cardTitle} t-display`}>{capability.title}</h3>
                <p className={`${styles.cardBody} t-body`}>{capability.body}</p>
              </article>
            ))}
          </Reveal>
        </div>
      </section>

      {PROJECTS.length ? (
        /* The case-study grid. Empty today; see the file note. */
        <section className={`${styles.section} is-light`} data-ground="light">
          <div className={styles.shell}>
            <Reveal className={styles.grid} stagger>
              {PROJECTS.map((project) => (
                <article key={project.slug} className={styles.card}>
                  <CinematicMedia id={project.hero} ratio="3 / 2" sizes="33vw" />
                  <h3 className={`${styles.cardTitle} t-display`}>{project.title}</h3>
                  <p className={`${styles.cardBody} t-body`}>{project.summary}</p>
                  <ActionLink href={`${ROUTES.projects.path}/${project.slug}`}>
                    {project.title}
                  </ActionLink>
                </article>
              ))}
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>{PROJECTS_NOTICE.heading}</h2>
            <p className="t-body">{PROJECTS_NOTICE.body}</p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.contact.path} variant="primary">
                {PROJECTS_NOTICE.cta}
              </ActionLink>
              <ActionLink href={ROUTES.craftManufacturing.path}>The workshop</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
