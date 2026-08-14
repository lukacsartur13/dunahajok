import type { Metadata } from "next";
import { BOATS } from "@/content/boats";
import { PXL } from "@/content/pxl";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { PageIntro } from "@/components/page/PageIntro";
import { BoatsGallery } from "./BoatsGallery";

export const metadata: Metadata = pageMetadata({
  route: "boats",
  title: "Boats",
  description:
    "The Duna 6.1 platform: the enclosed Cabin, finished like furniture, and the open Kadét. Six metres and ten centimetres, hand-built in Győr, in electric, petrol and outboard configurations.",
  image: "pair-onshore",
});

/**
 * THE PRODUCT FAMILY.
 *
 * §B3 asks for a family gallery rather than three ecommerce cards, and the
 * difference is what the page is FOR. A card grid asks "which one do you want";
 * a family gallery asks "what is the difference between these", which is the
 * actual question a visitor to a two-boat range arrives with.
 *
 * So the page is one platform stated once, then the two boats given a full
 * measure of the screen each, with their own character and their own ground.
 * The specifications are the same platform's twice; what differs is the word
 * each boat is built around.
 *
 * ── PXL IS NOT HERE, AND TURNING IT ON IS A DATA CHANGE ────────────────────
 *
 * §B3 asks that the page be architected so the PXL can appear later without a
 * rebuild. It is: the gallery maps over a list, and the list is filtered on
 * `published`. The PXL's record already exists, already carries
 * `published: false`, and already has its media and its route reserved. When
 * the yard announces it, the filter starts letting it through and this file
 * does not change.
 *
 * The filter is applied HERE, on the server, rather than in the component —
 * an unpublished product that reaches the client as a filtered-out array entry
 * is an unpublished product in the page source.
 */
export default function BoatsPage() {
  const published = [
    ...BOATS.map((boat) => ({
      id: boat.id,
      name: boat.fullName,
      character: boat.character,
      strapline: boat.strapline,
      copy: boat.copy,
      traits: boat.traits,
      hero: boat.hero,
      lifestyle: boat.lifestyle,
      href: boat.id === "cabin" ? ROUTES.cabin.path : ROUTES.kadet.path,
      specs: boat.specs.slice(0, 4),
    })),
    // The PXL, when it is announced. `published` is false, so this is an empty
    // spread today — and the shape it would take is written down rather than
    // waiting to be invented under deadline.
    ...(PXL.published
      ? [
          {
            id: "pxl" as const,
            name: PXL.fullName,
            character: "New",
            strapline: "",
            copy: "",
            traits: [] as readonly string[],
            hero: "cabin-studio-profile" as const,
            lifestyle: "cabin-exterior" as const,
            href: PXL.routes.product,
            specs: [],
          },
        ]
      : []),
  ];

  return (
    <>
      <PageIntro
        route={ROUTES.boats}
        eyebrow="The range"
        section="Boats"
        headline={["One platform.", "Two boats."]}
        lede="Six metres and ten centimetres of hand-built hull, drawn in 2016 and completed in 2020. What changes is what the boat is asked to be."
        media="pair-onshore"
        scale="wide"
        line="divider"
      />
      <BoatsGallery boats={published} />
    </>
  );
}
