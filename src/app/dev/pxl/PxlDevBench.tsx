"use client";

/**
 * THE DEVELOPMENT BENCH — the same configurator, with instruments beside it.
 *
 * There used to be two configurators. `/preview/pxl/configure` was the
 * customer's, and this route had one of its own: a boxed stage with a rail of
 * controls down the side and a column of development notices under them. They
 * shared the store, the catalogue, the scene and the model, and they shared
 * nothing else — so every change to the interface had to be made twice, and the
 * one nobody was looking at drifted. That is exactly how `night` came to be
 * missing from the customer's route for three phases while working perfectly
 * here: the feature worked everywhere it was being tested.
 *
 * So the second configurator is gone and this route mounts the first one. What
 * makes it a BENCH is what is mounted BESIDE it — telemetry and the reference
 * comparison — rather than a different set of controls for the same boat.
 *
 * WHAT WAS LOST WITH IT, and why it did not matter:
 *
 *   THE COLOUR-STUDY FALLBACK. The old bench replaced itself with a grid of
 *   the six delivered studies when WebGL was unavailable. The configurator
 *   already stands the study for the CHOSEN exterior into the stage — same
 *   imagery, and it follows the selection rather than showing all six at once.
 *
 *   THE DEVELOPMENT NOTICES. The console revision, the provisional names, the
 *   pending specifications. The provisional marker survives in the panel, and
 *   the rest is documentation about the asset rather than about the boat — it
 *   belongs in the phase reports, which is where it also is.
 *
 * The query flags are unchanged: `?debug=1` for telemetry, `?pxlReference=1`
 * for the plate comparison.
 */

import { useEffect, useState } from "react";
import { PxlProductConfigurator } from "@/components/pxl/PxlProductConfigurator";
import { PxlDebugPanel } from "./PxlDebugPanel";
import { PxlReferenceBench } from "./PxlReferenceBench";

export function PxlDevBench() {
  const [debug, setDebug] = useState(false);

  /* Read in an effect rather than during render, and it is not laziness: this
     route prerenders, so `window.location` does not exist when the HTML is
     written. Reading it in the body would produce one tree on the server and a
     different one in the browser — the hydration mismatch the debug panel
     itself learned about the hard way. */
  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  return (
    <>
      <PxlProductConfigurator />
      {debug ? <PxlDebugPanel /> : null}
      {/* Mounted unconditionally and gated on `?pxlReference=1` inside, for the
          same reason the flag above is read in an effect. It also compiles to a
          constant `null` in a production build, so §31's "no reference camera
          on a customer surface" holds by construction rather than by care. */}
      <PxlReferenceBench />
    </>
  );
}
