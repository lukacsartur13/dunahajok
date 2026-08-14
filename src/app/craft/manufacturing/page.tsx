import type { Metadata } from "next";
import { CRAFT_MANUFACTURING } from "@/content/craft";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { CraftPageView } from "@/components/page/CraftPageView";

export const metadata: Metadata = pageMetadata({
  route: "craftManufacturing",
  title: "Manufacturing",
  description:
    "Designed on the Danube, built in Győr. Duna Hajók builds every 6.1 by hand in its own facility, in the manufactory system the company has used since 1991.",
  image: "gyor-facility",
});

export default function CraftManufacturingPage() {
  return (
    <CraftPageView
      route={ROUTES.craftManufacturing}
      page={CRAFT_MANUFACTURING}
      current="manufacturing"
    />
  );
}
