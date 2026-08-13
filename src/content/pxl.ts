/**
 * Duna PXL — product record.
 *
 * SOURCE OF TRUTH, AND THE ABSENCE OF ONE.
 *
 * `boats.ts` opens by saying every figure in it is transcribed verbatim from
 * dunahajok.hu and nothing is estimated, rounded or inferred. The PXL is a new
 * product: there is no published page to transcribe from, and the material
 * delivered with it — an STL and seven design renders — contains no
 * specifications at all.
 *
 * So this file is mostly a list of things that are not known yet, and that is
 * deliberate. The one temptation worth naming: the model measures 5.2532 m by
 * 2.0943 m, and it would be easy to write "5.25 m LOA" here. That figure is a
 * *design model's bounding box*, not a specification. Real length overall on a
 * production boat includes fittings the model does not have and excludes
 * tolerances the model does not know about, and the yard has not stated it.
 * The measurement lives in `pxlModel.ts` where it belongs — as a fact about
 * the asset — and is deliberately not repeated here as a fact about the boat.
 *
 * Every field below is either verifiable from what was delivered or explicitly
 * marked unavailable. Nothing here should reach a customer-facing surface
 * until `verified` is true for the value in question.
 */

import { PXL_ROUTES } from "@/content/publication";
import type { PxlMediaId } from "@/lib/pxl.media.generated";

/**
 * A specification that may or may not exist yet.
 *
 * Modelled as a discriminated union rather than an optional string so that a
 * missing figure cannot be rendered by accident: a component has to handle
 * `available: false` to compile, and the natural thing to write in that branch
 * is nothing at all.
 */
export type PxlSpec =
  | { key: string; label: string; available: false; note: string }
  | { key: string; label: string; available: true; value: string; unit?: string; source: string };

export interface PxlProduct {
  id: "pxl";
  name: string;
  fullName: string;
  /** True while the product has not been publicly launched by the yard. */
  unannounced: boolean;
  /** Whether a customer-facing route may be linked. See the note below. */
  published: boolean;
  routes: {
    /** RESERVED. The public product page, once there is a product to publish. */
    product: string;
    /** RESERVED. The public configurator. */
    configure: string;
    /**
     * BUILT, AND UNPUBLISHED. The staging pair.
     *
     * Phase Three §3 asks for a safe preview path for a finished experience on
     * an unfinished product, and this is it: the customer-facing product page
     * and configurator, complete, at `/preview/…` rather than at the reserved
     * public routes. They are `noindex`, disallowed in `robots.txt`, absent
     * from the sitemap and linked from nothing — the same three guarantees
     * `/dev/pxl` has, applied to a surface that is no longer a bench.
     *
     * Publishing is then a routing change and a flag, not a rebuild: the
     * components are already the customer-facing ones, and everything they
     * refuse to print today they refuse for a reason that is written down.
     */
    preview: string;
    previewConfigure: string;
    /** The development bench. Never linked from a customer surface. */
    inspect: string;
  };
  media: {
    hero: PxlMediaId;
    views: PxlMediaId;
    colourStudies: readonly PxlMediaId[];
  };
  /** What the design material actually shows. Observations, not claims. */
  observed: readonly string[];
  specs: readonly PxlSpec[];
}

const UNKNOWN = (key: string, label: string, note: string): PxlSpec => ({
  key, label, available: false, note,
});

export const PXL: PxlProduct = {
  id: "pxl",
  name: "PXL",
  fullName: "Duna PXL",
  unannounced: true,

  /**
   * FALSE, and it should stay false until the yard signs off a specification.
   *
   * The routes below are reserved, not built. Shipping a product page for a
   * boat whose length, weight, capacity, power and price are all unknown means
   * shipping a page made of placeholders, and a placeholder on a boatbuilder's
   * site is a number a customer will quote back. The asset is finished; the
   * product information is not, and the honest response to that is an empty
   * route rather than a filled-in one.
   */
  published: false,

  // From `publication.ts`, which is also what `robots.ts` and the preview
  // layout read. Three files agreeing about which addresses are indexable is
  // not something to leave to three separate string literals.
  routes: PXL_ROUTES,

  media: {
    hero: "pxl-hero-side",
    views: "pxl-views",
    colourStudies: [
      "pxl-water-white",
      "pxl-water-sage",
      "pxl-water-black",
      "pxl-water-warm-grey",
      "pxl-water-gold",
      "pxl-water-navy",
    ],
  },

  /**
   * Read off the delivered renders and the 3D model. Descriptive, checkable,
   * and free of any number the yard has not published.
   */
  observed: [
    "Open boat with a single side-mounted helm console and a transom outboard.",
    "Faceted hull with a hard chine running the full length and a black moulded bottom.",
    "Black stern moulding carrying the PXL mark, and a black gunwale capping with a cognac inlay.",
    "Moulded cockpit liner with integrated seat boxes; upholstery appears in the renders only.",
    "Six hull colour studies were delivered; none has been confirmed as an orderable finish.",
  ],

  specs: [
    UNKNOWN("loa", "Length overall", "not published; the 3D model is a design study, not a spec sheet"),
    UNKNOWN("beam", "Beam", "not published"),
    UNKNOWN("draft", "Draft", "not published; the waterline used by the scene is a visual estimate"),
    UNKNOWN("weight", "Weight", "not published"),
    UNKNOWN("capacity", "Maximum crew", "not published"),
    UNKNOWN("power", "Power", "not published; the source model shows one outboard, unidentified"),
    UNKNOWN("speed", "Speed", "not published"),
    UNKNOWN("ceCategory", "CE category", "not published"),
    UNKNOWN("price", "Price", "not published, and out of scope for this phase"),
  ],
};

/** Specifications still needed from the yard before a product page can exist. */
export const PXL_MISSING_SPECS = PXL.specs.filter((s) => !s.available);

/**
 * The reference render for each exterior finish, by URL token.
 *
 * The studio delivered one water render per colour study, which makes this the
 * strongest possible fallback for the 3D stage: while the GLB is loading, and
 * permanently on a device that cannot run WebGL, the box shows a real
 * photograph-grade render of the boat *in the colour the visitor has chosen*
 * rather than a generic still (§57, §58). Keyed on `slug` rather than on the
 * internal id because the slug is the identifier that is already promised not
 * to move.
 */
export const PXL_STUDY_FOR_SLUG: Readonly<Record<string, PxlMediaId>> = {
  white: "pxl-water-white",
  sage: "pxl-water-sage",
  black: "pxl-water-black",
  "warm-grey": "pxl-water-warm-grey",
  gold: "pxl-water-gold",
  navy: "pxl-water-navy",
};
