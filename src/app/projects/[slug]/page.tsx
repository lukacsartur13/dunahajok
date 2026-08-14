import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PROJECTS, findProject } from "@/content/editorial";
import { ROUTES } from "@/content/routes";
import { SITE } from "@/content/site";
import { PageIntro } from "@/components/page/PageIntro";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import styles from "@/components/page/Page.module.css";

/**
 * §B15 — ONE REUSABLE PROJECT DETAIL ARCHITECTURE.
 *
 * Built, complete, and currently unreachable because `PROJECTS` is empty. That
 * is the point of building it now: the template is the thing that takes a week
 * to get right and the content is the thing that arrives on a Tuesday, so the
 * order to do them in is this one.
 *
 * EVERY SECTION AFTER THE HERO IS CONDITIONAL, which is §B15's actual
 * requirement — "allow projects to omit sections without leaving empty visual
 * shells". A restoration with no process photography renders a shorter page
 * rather than a heading over nothing, and the way that is guaranteed is that
 * each block is gated on its own data rather than on a flag somebody sets.
 *
 * `generateStaticParams` returns an empty array today, so the export builds
 * zero pages and the route contributes nothing to the bundle or the sitemap.
 */
export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) return { title: "Project" };
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `${ROUTES.projects.path}/${project.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE.name,
      title: `${project.title} — ${SITE.name}`,
      description: project.summary,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = findProject(slug);
  if (!project) notFound();

  return (
    <>
      <PageIntro
        route={ROUTES.projects}
        eyebrow={project.year ?? "Project"}
        section="Projects"
        headline={[project.title]}
        lede={project.summary}
        media={project.hero}
        scale="wide"
        line="divider"
      />

      {project.facts?.length ? (
        <section className={`${styles.section} is-light`} data-ground="light">
          <div className={styles.shell}>
            <dl className={styles.contactList}>
              {project.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="t-label">{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {(["story", "challenge", "process", "result"] as const).map((key) => {
        const body = project[key];
        if (!body?.length) return null;
        const heading = { story: "The boat", challenge: "The problem", process: "The work", result: "Afterwards" }[key];
        return (
          <section key={key} className={`${styles.section} is-light`} data-ground="light">
            <div className={styles.shell}>
              <div className={styles.sectionHead}>
                <p className="t-label">{heading}</p>
              </div>
              <Reveal className={styles.prose} stagger>
                {body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="t-body">
                    {paragraph}
                  </p>
                ))}
              </Reveal>
            </div>
          </section>
        );
      })}

      {project.gallery?.length ? (
        <section className={`${styles.section} is-light`} data-ground="light">
          <Reveal className={styles.gallery} stagger>
            {project.gallery.map((id) => (
              <CinematicMedia key={id} id={id} ratio="4 / 5" sizes="33vw" />
            ))}
          </Reveal>
        </section>
      ) : null}

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.actions}>
            <ActionLink href={ROUTES.projects.path} variant="primary">
              All projects
            </ActionLink>
            <ActionLink href={ROUTES.contact.path}>Ask about a project</ActionLink>
          </div>
        </div>
      </section>
    </>
  );
}
