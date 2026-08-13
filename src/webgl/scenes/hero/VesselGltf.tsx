"use client";

/**
 * THE PRODUCTION VESSEL — glTF path.
 *
 * ⚠️ NOT YET EXERCISED. No Duna 6.1 GLB exists in this repository, so
 * `vesselContract.ts` marks every vessel `available: false` and this module is
 * never imported at runtime — `VesselModel` code-splits it behind a dynamic
 * import precisely so that the DRACO/Meshopt loaders are not shipped to
 * visitors for an asset that is not there. It is type-checked and reviewed but
 * it has not rendered a frame; treat it as a specification in code, and expect
 * to spend an afternoon on materials the first time a real model goes through.
 *
 * What it does assume, and what WEBGL_ASSET_SPEC.md therefore requires:
 *
 *   • bow along +X, mast along +Y, origin on the waterline at the centre of
 *     buoyancy, authored in metres — so the model needs no correction to sit
 *     in a scene whose water is at y = 0 and whose wake starts at the transom;
 *   • materials separated by the groups in `VesselMaterialGroup`, named so
 *     they can be addressed without traversing by geometry;
 *   • no baked lighting, because the scene's own sky is the light source.
 *
 * Materials are *adjusted*, never replaced. A delivered PBR set is the yard's
 * description of its own product; the only things touched here are the ones
 * that are properties of this scene rather than of the boat — environment
 * intensity, and the tone of the glass against a very dark river.
 */

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D } from "three";
import type { VesselModelSpec } from "./vesselContract";

/** Scene-specific corrections, applied by material name prefix. */
const ADJUST: Record<string, (m: MeshStandardMaterial) => void> = {
  glass: (m) => {
    if (m instanceof MeshPhysicalMaterial) {
      m.transmission = Math.max(m.transmission, 0.62);
      m.thickness = m.thickness || 0.012;
    }
    m.envMapIntensity = 1.15;
  },
  teak: (m) => {
    // Teak photographs orange under studio light and reads brown on a river.
    // Roughness, not colour: the timber is the yard's, the light is ours.
    m.envMapIntensity = 0.55;
  },
  hull: (m) => {
    m.envMapIntensity = 1;
  },
  metal: (m) => {
    m.envMapIntensity = 1.25;
  },
  upholstery: (m) => {
    m.envMapIntensity = 0.35;
  },
};

export function VesselGltf({ spec }: { spec: VesselModelSpec }) {
  const { scene } = useGLTF(spec.url, spec.compression === "draco");

  const model = useMemo(() => {
    const root = scene.clone(true) as Object3D;
    root.rotation.y = spec.yaw;
    root.scale.setScalar(spec.scale);
    root.position.y = spec.draft;

    root.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = false;
      child.receiveShadow = false;
      const material = child.material;
      if (!(material instanceof MeshStandardMaterial)) return;
      const name = material.name.toLowerCase();
      for (const [group, adjust] of Object.entries(ADJUST)) {
        if (name.includes(group)) adjust(material);
      }
    });

    return root;
  }, [scene, spec.yaw, spec.scale, spec.draft]);

  useEffect(() => {
    return () => {
      model.traverse((child) => {
        if (child instanceof Mesh) child.geometry.dispose();
      });
    };
  }, [model]);

  return <primitive object={model} />;
}
