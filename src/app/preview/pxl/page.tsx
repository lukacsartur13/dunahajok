import type { Metadata } from "next";
import { PxlPreviewProduct } from "./PxlPreviewProduct";

/**
 * THE PXL PRODUCT PAGE — /preview/pxl
 *
 * The editorial half of the experience, at a staging address for the same
 * reason as its configurator: the boat exists, the product does not yet.
 * `/boats/pxl` is reserved.
 *
 * `robots` comes from the segment layout. The title carries PREVIEW because a
 * tab title and a bookmark are two places an unpublished product can be
 * mistaken for a launch, and neither reads a meta tag.
 */

export const metadata: Metadata = {
  title: "PXL — preview",
  description:
    "Preview of the Duna PXL. Unpublished product; no specifications have been released.",
};

export default function PxlPreviewPage() {
  return <PxlPreviewProduct />;
}
