/**
 * JSON-LD for the homepage.
 *
 * Only facts that appear on the page or on the source site are described:
 * the organisation, its address and contact points, the two products with
 * their published dimensions, and the awards. Prices are held in the product
 * model but not emitted, because an Offer that goes stale is worse for search
 * than no Offer at all.
 */

import { CABIN, KADET, type Boat } from "@/content/boats";
import { AWARDS } from "@/content/story";
import { CONTACT, SITE, SOCIALS } from "@/content/site";

function productNode(boat: Boat) {
  const dim = (label: string) => boat.specs.find((s) => s.label.includes(label));
  const length = dim("length");
  const width = dim("width");
  const weight = boat.specs.find((s) => s.label.toLowerCase().includes("weight"));

  return {
    "@type": "Product",
    name: boat.fullName,
    brand: { "@type": "Brand", name: SITE.name },
    manufacturer: { "@id": `${SITE.url}/#organization` },
    category: "Motorboat",
    description: boat.copy,
    image: `${SITE.url}/media/${boat.hero}.webp`,
    ...(length ? { depth: { "@type": "QuantitativeValue", value: length.value, unitCode: "MTR" } } : null),
    ...(width ? { width: { "@type": "QuantitativeValue", value: width.value, unitCode: "MTR" } } : null),
    ...(weight ? { weight: { "@type": "QuantitativeValue", value: weight.value, unitCode: "KGM" } } : null),
  };
}

export function StructuredData() {
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE.url}/#organization`,
      name: SITE.name,
      alternateName: [SITE.nameLatin, CONTACT.company],
      url: SITE.url,
      foundingDate: String(SITE.foundedYear),
      description: SITE.description,
      sameAs: SOCIALS.map((s) => s.href),
      address: {
        "@type": "PostalAddress",
        streetAddress: CONTACT.street,
        addressLocality: CONTACT.city,
        postalCode: CONTACT.postalCode,
        addressCountry: CONTACT.country,
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          telephone: CONTACT.phone,
          email: CONTACT.email,
          availableLanguage: ["hu", "en", "de", "sk"],
        },
        {
          "@type": "ContactPoint",
          contactType: "technical support",
          telephone: CONTACT.suzuki.phones[0],
          email: CONTACT.suzuki.email,
        },
      ],
      award: AWARDS.filter((a) => a.year).map((a) => `${a.title} ${a.year} — ${a.result} (${a.subject})`),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      inLanguage: SITE.locale,
      publisher: { "@id": `${SITE.url}/#organization` },
    },
    productNode(CABIN),
    productNode(KADET),
  ];

  return (
    <script
      type="application/ld+json"
      // Values come from local, hand-authored content modules — no user input.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
