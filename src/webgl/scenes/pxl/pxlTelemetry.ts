"use client";

/**
 * PXL — what the camera is actually doing.
 *
 * Framing a product is the one part of this scene that cannot be checked by
 * reading the code: an authored distance and field of view only *imply* how
 * much of the frame the boat fills, and the implication goes wrong the moment
 * perspective, a three-quarter angle and a viewport of an unexpected shape are
 * involved. §32 asks for the framing to hold at seven widths and §41 asks for
 * four views to be compared against the reference renders — both are questions
 * about pixels, and both deserve a number rather than an opinion.
 *
 * So the scene projects the vessel's bounding box through the live camera each
 * frame and records what fraction of the frame it covers, and whether any of
 * it fell outside. The development viewer prints it. Tuning a preset is then a
 * matter of moving `fill` to where it should be instead of squinting at a
 * screenshot.
 *
 * Development only in practice — nothing renders off it — but it costs eight
 * matrix transforms a frame and is left in the production path so that the
 * numbers in the phase report are the numbers the site actually produces.
 */

import { Box3, Vector3, type Camera, type Object3D } from "three";

export interface PxlTelemetry {
  /** The preset the camera is holding, or `free` once the viewer takes over. */
  preset: string;
  /** True while the viewer's own orbit is displacing the authored composition. */
  orbited: boolean;
  /**
   * True while a finish change is interpolating.
   *
   * The only externally observable evidence that §9's transition is running at
   * all: the change is a handful of uniform writes on materials nothing else
   * can see, and a canvas without `preserveDrawingBuffer` cannot be sampled
   * after the fact. Publishing the flag is what makes "the paint eases rather
   * than cuts" a measurement instead of a claim.
   */
  finishing: boolean;
  azimuth: number;
  elevation: number;
  distance: number;
  /** Vertical field of view actually set on the camera, degrees. */
  fov: number;
  /** Fraction of the frame the vessel spans, 0–1. */
  fillX: number;
  fillY: number;
  /**
   * Empty frame outside the vessel on each side, as a fraction of the frame.
   *
   * §17 asks for these by name and §18 explains why they are worth having
   * separately from `fill`: a boat can occupy 78% of the frame and still be
   * wrong, if 20% of that margin is stacked on one side. Negative means the
   * vessel has crossed that edge — which is what `clipped` reports, but these
   * say by how much and on which side, and that is the difference between
   * knowing a preset is broken and knowing which number to move.
   */
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  /** True when any corner of the vessel's bounding box left the frame. */
  clipped: boolean;
  slotWidth: number;
  slotHeight: number;
}

export const pxlTelemetry: PxlTelemetry = {
  preset: "",
  orbited: false,
  finishing: false,
  azimuth: 0,
  elevation: 0,
  distance: 0,
  fov: 0,
  fillX: 0,
  fillY: 0,
  marginLeft: 0,
  marginRight: 0,
  marginTop: 0,
  marginBottom: 0,
  clipped: false,
  slotWidth: 0,
  slotHeight: 0,
};

/**
 * Development only: the readout, on `window`.
 *
 * §76 asks for the framing to be checked at ten viewport sizes and §80 for
 * review frames at each. Reading a number off a screenshot is exactly the kind
 * of measurement that quietly becomes an opinion, so the numbers are published
 * where an automated pass can read them instead. Stripped from production
 * builds along with everything else behind this guard.
 */
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __pxlTelemetry?: PxlTelemetry }).__pxlTelemetry = pxlTelemetry;
}

const _box = new Box3();
const _corner = new Vector3();

/**
 * Measure the vessel against the frame.
 *
 * The bounding box's eight corners are enough: the extremes of a projected
 * convex hull are always projected extremes of the box that contains it, so no
 * amount of sampling the mesh itself would move the answer.
 */
export function measureFraming(model: Object3D, camera: Camera): void {
  _box.setFromObject(model);
  if (_box.isEmpty()) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let clipped = false;

  for (let i = 0; i < 8; i++) {
    _corner.set(
      i & 1 ? _box.max.x : _box.min.x,
      i & 2 ? _box.max.y : _box.min.y,
      i & 4 ? _box.max.z : _box.min.z,
    );
    _corner.project(camera);
    minX = Math.min(minX, _corner.x);
    maxX = Math.max(maxX, _corner.x);
    minY = Math.min(minY, _corner.y);
    maxY = Math.max(maxY, _corner.y);
    if (Math.abs(_corner.x) > 1 || Math.abs(_corner.y) > 1) clipped = true;
  }

  // NDC spans −1…1, so a span of 2 fills the frame exactly.
  pxlTelemetry.fillX = (maxX - minX) / 2;
  pxlTelemetry.fillY = (maxY - minY) / 2;
  // NDC y is up; the DOM's idea of "top" is +1.
  pxlTelemetry.marginLeft = (minX + 1) / 2;
  pxlTelemetry.marginRight = (1 - maxX) / 2;
  pxlTelemetry.marginTop = (1 - maxY) / 2;
  pxlTelemetry.marginBottom = (minY + 1) / 2;
  pxlTelemetry.clipped = clipped;
}
