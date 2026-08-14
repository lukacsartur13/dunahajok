import type { Metadata } from "next";
import { CONTACT, SOCIALS } from "@/content/site";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { EnquiryForm } from "@/components/page/EnquiryForm";
import { ActionLink } from "@/components/primitives/ActionLink";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "contact",
  title: "Contact",
  description:
    "Duna Enterior Kft., Ikrényi út 14, H-9025 Győr, Hungary. General enquiries, private viewings and Suzuki Marine service, from the workshop that builds the boats.",
  image: "gyor-facility",
});

/**
 * CONTACT — §B17.
 *
 * §B17 asks for a premium experience and says explicitly not to force everyone
 * through one giant generic form. Three intents, three destinations, and the
 * page opens by asking which one you are — because the three are answered by
 * different people at the yard and always have been. The Suzuki service line is
 * a different number in the source data; a single form would route a broken
 * gearbox to the sales inbox.
 *
 * THE DETAILS COME FIRST, ABOVE THE FORM. Most people who reach a boatbuilder's
 * contact page want a phone number, and putting a form above it is a decision
 * to prefer a lead over a customer. The form is for the enquiries that need a
 * paragraph.
 *
 * NOTHING IS SENT BY THIS PAGE — see `lib/enquiry.ts`. The form composes the
 * message, shows it, and hands it to the visitor's own mail client. That is the
 * honest ending while the site is a static export with no endpoint, and it is
 * the same decision the PXL request flow already made.
 */
export default function ContactPage() {
  return (
    <>
      <PageIntro
        route={ROUTES.contact}
        eyebrow="Duna Enterior Kft."
        section="Contact"
        headline={["Győr,", "on the Danube."]}
        lede={`${CONTACT.company} builds every boat at Ikrényi út 14. The workshop answers its own telephone.`}
        scale="inset"
        line="divider"
      />

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Direct</p>
            <h2 className={`${styles.sectionTitle} t-display`}>The yard</h2>
          </div>

          <dl className={styles.contactList}>
            <div>
              <dt className="t-label">Telephone</dt>
              <dd>
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </dd>
            </div>
            <div>
              <dt className="t-label">Email</dt>
              <dd>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </dd>
            </div>
            <div>
              <dt className="t-label">Workshop</dt>
              <dd>{CONTACT.addressLines.join(", ")}</dd>
            </div>
            <div>
              <dt className="t-label">{CONTACT.lead.role}</dt>
              <dd>
                {CONTACT.lead.name} ·{" "}
                <a href={`mailto:${CONTACT.lead.email}`}>{CONTACT.lead.email}</a>
              </dd>
            </div>
            <div>
              <dt className="t-label">Suzuki Marine service</dt>
              <dd>
                <a href={`mailto:${CONTACT.suzuki.email}`}>{CONTACT.suzuki.email}</a> ·{" "}
                {CONTACT.suzuki.hours}
              </dd>
            </div>
            <div>
              <dt className="t-label">Elsewhere</dt>
              <dd>
                {SOCIALS.map((social, index) => (
                  <span key={social.label}>
                    {index > 0 ? " · " : ""}
                    <a href={social.href} target="_blank" rel="noreferrer noopener">
                      {social.label}
                    </a>
                  </span>
                ))}
              </dd>
            </div>
          </dl>

          <div className={styles.actions}>
            <ActionLink href={ROUTES.privateViewing.path} variant="primary">
              Arrange a private viewing
            </ActionLink>
            <ActionLink href={`${ROUTES.suzuki.path}#service`}>Suzuki service</ActionLink>
          </div>
        </div>
      </section>

      <section className={`${styles.section} is-light`} data-ground="light" id="enquiry">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">General enquiry</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Write to the yard</h2>
            <p className="t-body">
              For anything that needs a paragraph. A viewing request has its own
              short form, and engine service has its own line.
            </p>
          </div>
          <EnquiryForm intent="general" sourcePage={ROUTES.contact.path} />
        </div>
      </section>
    </>
  );
}
