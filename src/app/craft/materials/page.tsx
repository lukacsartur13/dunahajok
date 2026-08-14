import type { Metadata } from "next";
import { CRAFT_MATERIALS, MATERIALS } from "@/content/craft";
import { ROUTES } from "@/content/routes";
import { pageMetadata } from "@/lib/seo";
import { CraftPageView } from "@/components/page/CraftPageView";
import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { Reveal } from "@/components/primitives/Reveal";
import styles from "./materials.module.css";

export const metadata: Metadata = pageMetadata({
  route: "craftMaterials",
  title: "Materials",
  description:
    "Teak, laid by hand. The four surfaces a Duna 6.1 is actually made of, photographed close: deck, rail, bathing platform and the Cabin's upholstered interior.",
  image: "teak-bow",
});

/**
 * MATERIALS — §B9.
 *
 * The one Craft page with no movements. §B9 asks for large macros, material
 * transitions, tactile scroll and minimal copy, and a page of `Movement`s with
 * one sentence in each would be a page of headings with photographs attached.
 *
 * So it renders a sequence instead: four full-height bands, each one a macro
 * with the material's name set over it and three facts beside it. The scroll
 * IS the transition — one surface fills the frame, then the next does — which
 * is the tactile reading §B9 asks for and needs no effect to achieve.
 *
 * FOUR MATERIALS, AND NOT ONE MORE. §B9's list also names glass and
 * paint/composite. Neither is in the photography library and neither has been
 * described by the yard, so neither is here. A macro of somebody else's glass
 * would be the exact failure §B29 warns about.
 */
export default function CraftMaterialsPage() {
  return (
    <CraftPageView route={ROUTES.craftMaterials} page={CRAFT_MATERIALS} current="materials">
      <div className={styles.sequence}>
        {MATERIALS.map((material, index) => (
          <section
            key={material.id}
            className={styles.band}
            data-align={index % 2 === 0 ? "start" : "end"}
            aria-labelledby={`material-${material.id}`}
          >
            <div className={styles.plate}>
              <CinematicMedia
                id={material.media}
                sizes="100vw"
                ratio="16 / 9"
                cut={index === 0 ? "bottom" : "both"}
                parallax
                scrim={0.42}
              />
            </div>

            <Reveal className={styles.caption}>
              <p className={`${styles.index} t-label`}>{material.index}</p>
              <h2 className={`${styles.name} t-display`} id={`material-${material.id}`}>
                {material.name}
              </h2>
              <p className={`${styles.lede} t-lead`}>{material.lede}</p>
              <p className={`${styles.body} t-body`}>{material.body}</p>
              <ul className={styles.facts}>
                {material.facts.map((fact) => (
                  <li key={fact} className="t-label">
                    {fact}
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>
        ))}
      </div>
    </CraftPageView>
  );
}
