import type { Metadata } from "next";
import { CRAFT_DESIGN } from "@/content/craft";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { CraftPageView } from "@/components/page/CraftPageView";

export const metadata: Metadata = pageMetadata({
  route: "craftDesign",
  title: "Design",
  description:
    "From line to water: how a Győr joinery workshop established in 1991 came to draw its own hull in 2016, and completed the Duna 6.1 as an electric boat in 2020.",
  image: "design-render",
});

export default function CraftDesignPage() {
  return <CraftPageView route={ROUTES.craftDesign} page={CRAFT_DESIGN} current="design" />;
}
