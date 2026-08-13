"use client";

/**
 * THE PXL, EDITORIALLY — the page the configurator is entered from.
 *
 * §37 asks that moving between the product and the configurator feel
 * intentional in both directions, and §68 that the whole thing have a beginning
 * and an end. That needs somewhere to begin: a page where the PXL is presented
 * as a designed object rather than as a thing to be operated. So this is the
 * editorial mode — the vessel on the Danube, in the Phase Two water, with type
 * around it — and CONFIGURE YOUR PXL is the door into product mode.
 *
 * WHAT IT SAYS IS ONLY WHAT IS KNOWN. `PXL.observed` is a list of things
 * readable off the delivered renders and the model, and the specification
 * table prints nine "not published" rows rather than nine plausible numbers
 * (§47). There is no price, no lead time, and no performance claim, because
 * none exists — and a boatbuilder's site is precisely where an invented figure
 * gets quoted back at the yard.
 *
 * THE TRANSITION IS THE INTERESTING PART. §5 rules out a route flash, and the
 * problem is that the two ends of the move are two React trees: this page can
 * fade itself out, but it cannot hold a curtain up over a route that has not
 * mounted. So the curtain is drawn twice — down here, up there — with a session
 * flag between them. See `pxlEntry`.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PxlStage } from "@/components/scene/PxlStage";
import { PXL } from "@/content/pxl";
import { pxlStrings } from "@/content/pxlStrings";
import { SITE } from "@/content/site";
import { PXL_MEDIA } from "@/lib/pxl.media.generated";
import { useReducedMotion } from "@/lib/hooks";
import { markPxlEntry } from "@/components/pxl/pxlEntry";
import { currentPxlQuery, loadPxlConfigurationFromUrl } from "@/webgl/scenes/pxl/pxlStore";
import styles from "./PxlPreviewProduct.module.css";

/** Seconds the departure takes. Long enough to read as a move, short enough
 *  that nobody waits for it. Matched to the arrival at the other end. */
const LEAVE_MS = 520;

export function PxlPreviewProduct() {
  const t = pxlStrings(SITE.locale);
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  /* The configuration is read here too, not only in the configurator.
     §37: a visitor who has configured a boat, come back to read about it and
     then gone in again should find their boat, not the default one — and the
     URL is where that survives. Nothing is written back from this page. */
  useEffect(() => {
    loadPxlConfigurationFromUrl(window.location.search);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const enter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Modified clicks are the browser's, not ours. A middle-click or a
      // cmd-click on a link that calls preventDefault is a link that is broken
      // in the one way power users notice immediately.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();

      const query = currentPxlQuery();
      const href = query
        ? `${PXL.routes.previewConfigure}?${query}`
        : PXL.routes.previewConfigure;

      markPxlEntry();
      if (reducedMotion) {
        router.push(href);
        return;
      }
      // Editorial mode stands down first: the type recedes, the surroundings
      // mask away, and only then does the route change — so the navigation
      // happens behind a screen that is already the destination's own ground.
      setLeaving(true);
      timer.current = window.setTimeout(() => router.push(href), LEAVE_MS);
    },
    [reducedMotion, router],
  );

  const hero = PXL_MEDIA[PXL.media.hero];

  return (
    <div className={styles.page} data-leaving={leaving || undefined}>
      {/* §3: this is a staging surface for an unannounced product, and it says
          so on itself. Not a development notice in a dashed box — a single
          quiet line, because the page is otherwise indistinguishable from a
          real product page and that is exactly the risk. */}
      <p className={styles.notice}>{t.previewNotice}</p>

      <header className={styles.masthead}>
        <span className={styles.marque}>{SITE.wordmark}</span>
        <h1 className={styles.title}>{PXL.name}</h1>
        <p className={styles.lede}>{t.previewLede}</p>
      </header>

      {/* The vessel, on the river. The configurator's studio is a different
          room for a different job (see `pxlLighting`); here the boat is in the
          world, which is what makes entering product mode feel like going
          somewhere. */}
      <div className={styles.stage}>
        <PxlStage
          preset="hero_3q"
          water
          priority
          label={t.sceneDescription}
          fallback={PXL.media.hero}
          sizes="100vw"
        />
      </div>

      <div className={styles.enter}>
        <a className={styles.cta} href={PXL.routes.previewConfigure} onClick={enter}>
          {t.enter}
        </a>
      </div>

      <section className={styles.body}>
        <div className={styles.column}>
          <h2 className={styles.label}>{t.observedHeading}</h2>
          <ul className={styles.observed}>
            {PXL.observed.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <h2 className={styles.label}>{t.specsHeading}</h2>
          {/* §47: nine rows, all of them "not published". A specification table
              that prints its own absence is more use to a visitor than no table
              — and infinitely more use to the yard than an invented one. */}
          <dl className={styles.specs}>
            {PXL.specs.map((spec) => (
              <div className={styles.specRow} key={spec.key}>
                <dt>{spec.label}</dt>
                <dd>{spec.available ? `${spec.value}${spec.unit ?? ""}` : t.specsPending}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <figure className={styles.plate}>
        <Image
          src={hero.src}
          alt={hero.alt}
          width={hero.width}
          height={hero.height}
          sizes="100vw"
          placeholder="blur"
          blurDataURL={hero.blurDataURL}
        />
      </figure>

      {/* The curtain, drawn on the way out. `pointer-events` follow it so a
          second click during the transition cannot start a second navigation. */}
      <div className={styles.veil} aria-hidden="true" />
    </div>
  );
}
