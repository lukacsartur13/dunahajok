/**
 * SECTION 06 — Designed on the Danube. Built in Győr.
 *
 * Manufacturing is the differentiator, so it gets a section on the homepage
 * rather than a paragraph on an About page. The plates are laid out on an
 * asymmetric grid with drawing-sheet captions — indexed, dimensioned, the way
 * a workshop labels its own work — so the section reads as a record of a place
 * rather than as a photo gallery.
 */

import { CinematicMedia } from "@/components/primitives/CinematicMedia";
import { DisplayLines, SectionLabel } from "@/components/primitives/Type";
import { Reveal } from "@/components/primitives/Reveal";
import { ActionLink } from "@/components/primitives/ActionLink";
import { CONTACT } from "@/content/site";
import type { MediaId } from "@/lib/media.generated";
import styles from "./MadeInGyor.module.css";

interface Plate {
  id: MediaId;
  index: string;
  caption: string;
  area: "a" | "b" | "c" | "d";
  ratio: string;
}

const PLATES: readonly Plate[] = [
  {
    id: "gyor-facility",
    index: "06.1",
    caption: "The works — Ikrényi út, Győr",
    area: "a",
    ratio: "3 / 2",
  },
  {
    id: "brand-mark",
    index: "06.2",
    caption: "Maker's plate, applied by hand",
    area: "b",
    ratio: "4 / 5",
  },
  {
    id: "gyor-boat-trailer",
    index: "06.3",
    caption: "A finished 6.1, ready to leave",
    area: "c",
    ratio: "4 / 3",
  },
  {
    id: "workshop-engine",
    index: "06.4",
    caption: "Service bench — Suzuki Marine",
    area: "d",
    ratio: "3 / 2",
  },
];

export function MadeInGyor() {
  return (
    <section id="gyor" className={`${styles.section} is-light`} data-ground="light">
      <div className={styles.head}>
        <SectionLabel index="06">Manufacture</SectionLabel>
        {/* Three authored lines, not two: at the top of the d1 scale the first
            clause is wider than the measure and would re-wrap inside a single
            mask, breaking the per-line reveal. */}
        <DisplayLines size="d1" lines={["Designed on", "the Danube.", "Built in Győr."]} />
      </div>

      <div className={styles.grid}>
        {PLATES.map((plate) => (
          <figure key={plate.id} className={`${styles.plate} ${styles[`area-${plate.area}`]}`}>
            <CinematicMedia
              id={plate.id}
              ratio={plate.ratio}
              sizes="(max-width: 61.25rem) 92vw, 42vw"
              parallax={0.55}
            />
            <figcaption className={`${styles.caption} t-label`}>
              <span className={styles.captionIndex}>{plate.index}</span>
              <span className={styles.captionRule} aria-hidden="true" />
              {plate.caption}
            </figcaption>
          </figure>
        ))}

        <Reveal className={styles.copy} stagger>
          <p className="t-lead">
            A manufactory-system carpentry company that also builds boats — in its own factory, with
            its own people.
          </p>
          <p className="t-body">
            Every hull is finished in Győr by a team of qualified joiners using raw materials from
            controlled procurement. It is why the boats look like furniture, and why no two are
            quite identical.
          </p>
          <ActionLink href={`mailto:${CONTACT.email}`}>Arrange a works visit</ActionLink>
        </Reveal>
      </div>
    </section>
  );
}
