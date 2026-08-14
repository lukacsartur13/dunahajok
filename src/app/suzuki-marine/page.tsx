import type { Metadata } from "next";
import { SUZUKI } from "@/content/suzuki";
import { CONTACT } from "@/content/site";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { Movement } from "@/components/page/Movement";
import { ActionLink } from "@/components/primitives/ActionLink";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "suzuki",
  title: "Suzuki Marine",
  description:
    "Duna Hajók has been an official Suzuki Marine dealership and service point since 2022, with a joint boat and engine showroom in Győr. Service is booked directly with the workshop.",
  image: "suzuki-engine",
});

/**
 * SUZUKI MARINE — §B12, §B13.
 *
 * §B12 asks for a proper section rather than something bolted on, and §B13 asks
 * that it be slightly more technical than the rest of the site while staying
 * inside Duna's design system — explicitly NOT a red-and-blue corporate
 * microsite.
 *
 * Both are settled by the same decision: the section uses `tone: "technical"`,
 * which is the site's own sunk-paper ground with the mono annotations promoted,
 * and it borrows nothing from Suzuki but the name. There is no Suzuki logo, no
 * wordmark and no brand colour anywhere in this route, because none has been
 * licensed for this site — see the header of `content/suzuki.ts`, which also
 * records exactly what the relationship is verified to be and what this page is
 * therefore not allowed to claim.
 *
 * WHY THERE IS NO ENGINE RANGE. §B12 says to build Engines "where content
 * allows". No approved model list has been supplied, and inventing one on a
 * dealership page would be publishing a product catalogue for products nobody
 * has confirmed are stocked. The section states the dealership's status, the
 * two power figures the source site publishes for the Kadét, and the way to
 * ask about the rest.
 */
export default function SuzukiPage() {
  return (
    <>
      <PageIntro
        route={ROUTES.suzuki}
        eyebrow={SUZUKI.status}
        section="Suzuki Marine"
        headline={[...SUZUKI.headline]}
        lede={SUZUKI.lede}
        media={SUZUKI.hero}
        scale="wide"
        line="construction"
      />

      <div className={styles.movements}>
        {SUZUKI.sections.map((section, index) => (
          <Movement
            key={section.id}
            id={section.id}
            index={section.index}
            eyebrow={section.eyebrow}
            title={section.title}
            lede={section.lede}
            body={section.body}
            media={section.media}
            annotations={section.facts}
            side={index % 2 === 0 ? "right" : "left"}
          />
        ))}
      </div>

      {/* Service contact, on the page rather than only on /contact. Somebody who
          has arrived here has arrived with an engine problem, and making them
          navigate to a general contact form to report it is the whole reason
          dealership sites feel bolted on. */}
      <section className={`${styles.section} is-dark`} data-ground="dark" id="service">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>Book service</h2>
            <p className="t-body">
              Service is booked directly with the dealership, {CONTACT.suzuki.hours}.
            </p>
            <dl className={styles.contactList}>
              {CONTACT.suzuki.phones.map((phone) => (
                <div key={phone}>
                  <dt className="t-label">Telephone</dt>
                  <dd>
                    <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
                  </dd>
                </div>
              ))}
              <div>
                <dt className="t-label">Email</dt>
                <dd>
                  <a href={`mailto:${CONTACT.suzuki.email}`}>{CONTACT.suzuki.email}</a>
                </dd>
              </div>
              <div>
                <dt className="t-label">Address</dt>
                <dd>{CONTACT.addressLines.join(", ")}</dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.contact.path} variant="primary">
                Contact
              </ActionLink>
              <ActionLink href={ROUTES.kadet.path}>The Kadét</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
