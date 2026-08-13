import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { ProductSplit } from "@/components/sections/ProductSplit";
import { TechnicalSpecs } from "@/components/sections/TechnicalSpecs";
import { StorySequence } from "@/components/sections/StorySequence";
import { CraftSection } from "@/components/sections/CraftSection";
import { MadeInGyor } from "@/components/sections/MadeInGyor";
import { Timeline } from "@/components/sections/Timeline";
import { AwardsFeature } from "@/components/sections/AwardsFeature";
import { PowerSelector } from "@/components/sections/PowerSelector";
import { EditorialCTA } from "@/components/sections/EditorialCTA";
import { StructuredData } from "@/components/seo/StructuredData";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <Hero />
      <ProductSplit />
      <TechnicalSpecs />
      <StorySequence />
      <CraftSection />
      <MadeInGyor />
      <Timeline />
      <AwardsFeature />
      <PowerSelector />
      <EditorialCTA />
    </>
  );
}
