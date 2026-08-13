import type { Metadata } from "next";
import { PXL } from "@/content/pxl";
import { PxlProductConfigurator } from "@/components/pxl/PxlProductConfigurator";

/**
 * THE PXL CONFIGURATOR — /preview/pxl/configure
 *
 * The customer-facing experience, at a staging address because the product it
 * configures is unpublished. `/boats/pxl/configure` is reserved for the day
 * `PXL.published` becomes true; nothing about this component would change when
 * it moves, which is the point of building it here rather than building a
 * second thing later.
 *
 * The `robots` block is inherited from the segment layout — see
 * `src/app/preview/layout.tsx` for why the guarantee is made there rather than
 * repeated on each page. What this file adds is the title, and a title that
 * says PREVIEW: a browser tab and a bookmark are two surfaces where an
 * unpublished product can be mistaken for a published one, and neither of them
 * reads a meta robots tag.
 *
 * DIRECT NAVIGATION IS A FIRST-CLASS ENTRY. §36: the configuration comes from
 * the URL, so a shared link opens the boat it describes, a refresh keeps it, and
 * back and forward behave. None of that depends on having come through the
 * product page — the cinematic entry is a nicety for people who did, not a
 * prerequisite for people who did not.
 */

export const metadata: Metadata = {
  title: "PXL configurator — preview",
  description:
    "Preview of the Duna PXL configurator. Unpublished product; specifications and finish names are not confirmed.",
};

export default function PxlConfigurePage() {
  // A reminder rather than a guard. Publishing is a decision about routes and
  // content, and the day `published` flips this staging route should be retired
  // rather than left serving a live product from a noindex address — which is
  // how a launched product ends up split across two URLs. Development only:
  // failing a production build over a flag somebody deliberately set would be
  // the tail wagging the dog.
  if (process.env.NODE_ENV !== "production" && PXL.published) {
    console.warn(
      "PXL is published — move the configurator to PXL.routes.configure and retire /preview/pxl.",
    );
  }
  return <PxlProductConfigurator />;
}
