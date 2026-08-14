import type { Metadata } from "next";
import { BOATS } from "@/content/boats";
import { PXL } from "@/content/pxl";
import { CONTACT } from "@/content/site";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { EnquiryForm } from "@/components/page/EnquiryForm";
import { ActionLink } from "@/components/primitives/ActionLink";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = pageMetadata({
  route: "privateViewing",
  title: "Private viewing",
  description:
    "See a Duna 6.1 at the workshop in Győr. Request a private viewing of the Cabin or the Kadét with the people who build them.",
  image: "cabin-studio-profile",
});

/**
 * PRIVATE VIEWING — §B18.
 *
 * §B18 asks that this feel more premium than "contact us", and the way it earns
 * that is not decoration — it is that the page knows what it is asking for.
 * SELECT BOAT · YOUR DETAILS · MESSAGE · REQUEST, in that order, with the boat
 * first because it is the question that changes the conversation.
 *
 * ── PXL IS NOT IN THE LIST, AND IT IS FILTERED RATHER THAN OMITTED ─────────
 *
 * §B18 says the PXL should not appear until published. It does not appear, and
 * the reason it does not is `PXL.published === false` evaluated on the server —
 * not because somebody left it out of an array. When the yard announces it, the
 * boat joins the selector and this file does not change.
 *
 * That distinction is the whole of why the filter is written out rather than
 * the two boats being listed literally: a hard-coded pair is a list somebody
 * has to remember to update, and the thing they would be forgetting is the
 * unannounced product.
 */
export default function PrivateViewingPage() {
  const boats = [
    ...BOATS.map((boat) => ({ id: boat.id, name: boat.fullName })),
    ...(PXL.published ? [{ id: PXL.id, name: PXL.fullName }] : []),
  ];

  return (
    <>
      <PageIntro
        route={ROUTES.privateViewing}
        eyebrow="Private viewing"
        section="Contact"
        headline={["See one", "before it is yours."]}
        lede="Every Duna 6.1 is built to order. A viewing at the Győr workshop is the way to see the joinery, the teak and the boat itself."
        media="cabin-studio-profile"
        scale="wide"
        line="profile"
      />

      <section className={`${styles.section} is-dark`} data-ground="dark">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className="t-label">Request a viewing</p>
            <h2 className={`${styles.sectionTitle} t-display`}>Four questions</h2>
            <p className="t-body">
              Which boat, who you are, when suits, and anything you would like us
              to have ready. {CONTACT.lead.name} answers these personally.
            </p>
          </div>

          <EnquiryForm
            intent="viewing"
            boats={boats}
            sourcePage={ROUTES.privateViewing.path}
            submitLabel="Prepare request"
          />
        </div>
      </section>

      <section className={`${styles.section} is-light`} data-ground="light">
        <div className={styles.shell}>
          <div className={styles.notice}>
            <h2 className={`${styles.noticeHeading} t-display`}>Or simply call</h2>
            <p className="t-body">
              {CONTACT.addressLines.join(", ")}. The workshop answers its own
              telephone on <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>.
            </p>
            <div className={styles.actions}>
              <ActionLink href={ROUTES.boats.path} variant="primary">
                The range
              </ActionLink>
              <ActionLink href={ROUTES.contact.path}>All contact details</ActionLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
