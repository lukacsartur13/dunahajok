"use client";

/**
 * THE VESSEL, as a photographic plate.
 *
 * Two quads standing on the water at the vessel's true size — the matte, and
 * its reflection — plus the loading of the one texture they share. The
 * compositing itself is in `glsl/plate.ts`; what lives here is the geometry,
 * the world placement and the colour pipeline.
 *
 * PLACEMENT. The quad's origin is its *bottom edge*, not its centre, because
 * the bottom edge is the waterline: the matte was cut there on purpose, so the
 * plate stands on y = 0 by construction and no magic offset is needed to make
 * a 2.43 m superstructure sit on a river. The reflection is the same geometry
 * with `scale.y = -1`, which mirrors it about exactly that line.
 *
 * COLOUR. The texture is flagged `NoColorSpace` and decoded by hand in the
 * shader. three does not patch texture reads inside a ShaderMaterial, so an
 * sRGB-flagged texture would arrive un-decoded and the hull would come out
 * washed and pale — the classic symptom of a photograph dropped into a WebGL
 * scene without a colour pipeline. Decoding explicitly means the plate and the
 * DOM photography either side of it are graded identically.
 */

import { useEffect, useMemo, useState } from "react";
import {
  DoubleSide,
  NoColorSpace,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  type Texture,
} from "three";
import { ATMOSPHERE_GLSL } from "@/webgl/glsl/atmosphere";
import { PLATE_FRAGMENT, PLATE_VERTEX, REFLECTION_FRAGMENT } from "@/webgl/glsl/plate";
import { RAKE_GLSL, SRGB_GLSL } from "@/webgl/glsl/rake";
import { VESSEL_PLATES } from "@/lib/vessel.generated";
import { HERO_PLATE } from "./vesselContract";
import { pick, type HeroUniforms } from "./heroUniforms";

const SKY_KEYS = [
  "uZenith",
  "uHorizon",
  "uKeyColor",
  "uKeyDir",
  "uBankColor",
  "uDeepColor",
  "uScatterColor",
  "uRake",
] as const;

interface VesselPlateProps {
  uniforms: HeroUniforms;
  /** Draw the mirrored plate. Off on the low tier. */
  reflection: boolean;
  onReady: (ok: boolean) => void;
}

export function VesselPlate({ uniforms, reflection, onReady }: VesselPlateProps) {
  const plate = VESSEL_PLATES[HERO_PLATE];
  const [texture, setTexture] = useState<Texture | null>(null);

  /* One texture, loaded once, shared by both quads. */
  useEffect(() => {
    let cancelled = false;
    let loaded: Texture | null = null;

    new TextureLoader().load(
      plate.src,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        // Decoded in the shader — see the header. Anisotropy is left at the
        // default: the plate is close to screen-aligned and never grazing.
        tex.colorSpace = NoColorSpace;
        tex.generateMipmaps = true;
        tex.anisotropy = 4;
        loaded = tex;
        setTexture(tex);
        uniforms.uMap.value = tex;
        onReady(true);
      },
      undefined,
      () => {
        if (!cancelled) onReady(false);
      },
    );

    return () => {
      cancelled = true;
      loaded?.dispose();
      uniforms.uMap.value = null;
    };
  }, [plate.src, uniforms, onReady]);

  /* True size, origin on the waterline. */
  const geometry = useMemo(() => {
    const height = plate.heightMetres;
    const geo = new PlaneGeometry(plate.metres, height, 1, 1);
    geo.translate(0, height / 2, 0);
    return geo;
  }, [plate.metres, plate.heightMetres]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PLATE_VERTEX,
        fragmentShader:
          ATMOSPHERE_GLSL + RAKE_GLSL + SRGB_GLSL + PLATE_FRAGMENT,
        uniforms: {
          ...pick(uniforms, SKY_KEYS),
          uMap: uniforms.uMap,
          uFade: uniforms.uFade,
          uHaze: uniforms.uHaze,
          uExposure: uniforms.uExposure,
          uWaterline: uniforms.uWaterline,
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [uniforms],
  );

  const reflectionMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: PLATE_VERTEX,
        fragmentShader:
          ATMOSPHERE_GLSL + RAKE_GLSL + SRGB_GLSL + REFLECTION_FRAGMENT,
        uniforms: {
          ...pick(uniforms, SKY_KEYS),
          uMap: uniforms.uMap,
          uFade: uniforms.uFade,
          uTime: uniforms.uTime,
          uStrength: uniforms.uReflStrength,
          uBreakup: uniforms.uBreakup,
        },
        transparent: true,
        // A reflection is light leaving the top of the water, not an object
        // beneath it. Depth-testing it against the surface it belongs to would
        // hide it completely. See glsl/plate.ts.
        depthTest: false,
        depthWrite: false,
        side: DoubleSide,
      }),
    [uniforms],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      reflectionMaterial.dispose();
    },
    [geometry, material, reflectionMaterial],
  );

  if (!texture) return null;

  return (
    <group name="vessel-plate">
      {reflection ? (
        <mesh
          geometry={geometry}
          material={reflectionMaterial}
          scale={[1, -1, 1]}
          renderOrder={5}
          frustumCulled={false}
        />
      ) : null}
      <mesh
        geometry={geometry}
        material={material}
        renderOrder={6}
        frustumCulled={false}
      />
    </group>
  );
}
