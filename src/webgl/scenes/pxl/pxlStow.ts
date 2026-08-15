/**
 * PXL — STRIKING THE BIMINI.  PHASE 4.10.18.
 *
 * ── WHY THE FRAME IS FIVE NODES ────────────────────────────────────────────
 *
 * A bimini folds by turning rigid tubes about the fittings they stand on. Two
 * earlier versions tried to do that to ONE mesh with a per-vertex rule, and no
 * per-vertex rule can keep a straight tube straight: turning each vertex about
 * the point below itself shortened the struts from 1.23 m to 0.79, and turning
 * them all about one centre lifted the deck fittings off the capping. Both were
 * measured on the built model.
 *
 * So the members are nodes, because a node is what three can move rigidly:
 *
 *   `bimini_frame`  the six deck fittings. Bolted down; never moves.
 *   `bimini_aft`    the after bow and the two struts that carry it.
 *   `bimini_fwd`    the forward bow and its two struts.
 *   `bimini_mid`    the middle bow. It has no fitting, so it only RISES.
 *   `bimini_brace`  the tube between the middle bow and the after strut.
 *
 * `pxl_blender` puts the two turning nodes on the fitting both their struts
 * come down to, so each is `rotateX(angle)` and there is not a coordinate in
 * this file for them — the contract `pxlLids` is on.
 *
 * ── AND WHY THE MIDDLE BOW IS SOLVED, NOT AUTHORED ─────────────────────────
 *
 * The brace is rigid and joins a point on the after strut to a point on the
 * middle bow. Turn the strut and that first point moves on a circle; the middle
 * bow can only rise; so its rise is whatever keeps the brace its own length.
 * That is one equation in one unknown and it has a closed form — the top is a
 * two-bar linkage and this is the bar. Nothing here decides how high the middle
 * bow goes; the geometry does.
 *
 * ── WHY IT IS NOT A CONFIGURATION ──────────────────────────────────────────
 *
 * The same reason a seat being open is not: it is a way of looking at the boat,
 * not part of what anybody would order. So the state is held here, it is not
 * serialised, and a shared link opens the boat with the top up.
 *
 * ── AND WHY IT HAS TO BE RE-APPLIED ────────────────────────────────────────
 *
 * `applyConfiguration` owns `mesh.visible` and `renderPxlFrame` re-applies the
 * whole configuration before it draws, so anything written outside it is
 * temporary — which is how the night silhouette was lost in 4.9. This is
 * written after configuration, every frame, and it is idempotent.
 */

import { MathUtils, Matrix4, Quaternion, Vector3, type Mesh } from "three";
import type { PxlZone } from "./pxlModel";

/** Every zone this state can reach. Nothing else on the boat is touched. */
export const PXL_STOW_ZONES: readonly PxlZone[] = [
  "bimini_canopy",
  "bimini_frame",
  "bimini_aft",
  "bimini_fwd",
  "bimini_mid",
  "bimini_brace",
  "bimini_boot",
  "bimini_strap",
];

/** The damping time constant, in seconds. Three of these is 95% of the way. */
const SETTLE = 0.34;

/** Below this the transition is over and the frame loop can stop. */
const EPSILON = 1e-3;

/**
 * How far the end bows swing on their fitting, in radians.
 *
 * NEGATIVE, and the sign is the whole of it: `hinge_on` points each node's
 * local X along the fitting's line, and which way a positive turn goes is then
 * a property of the export rather than a choice. Measured on the built model, a
 * positive angle laid the frame flat on the deck; this is the other way.
 *
 * 34° carries each strut's head 601 mm along the boat and 275 mm UP — up,
 * because the struts are raked 780 mm from the fitting they stand on, so
 * turning them toward vertical lengthens their reach in height. That is the
 * upward arc the client asked for, and it is a property of the frame rather
 * than a number chosen to produce it.
 */
const SWING = MathUtils.degToRad(-34);

/** Where in the travel the sleeve appears, and where the canvas goes. */
const BOOT_IN = 0.74;
const CANVAS_OUT = 0.92;

export interface PxlStowState {
  /** What the viewer has asked for. */
  stowed: boolean;
  /** Where the motion actually is, 0–1. */
  t: number;
  primed: boolean;
  /** The brace's lower end, in the after node's own frame — so it rides it. */
  braceFoot: Vector3;
  /** The brace's upper end and the middle bow's rest position, in the vessel. */
  braceHead: Vector3;
  /** The same foot, left in the vessel's frame — the turn is solved there. */
  braceFootRest: Vector3;
  braceLength: number;
  midRest: Vector3;
  bootRest: Vector3;
  braceRest: Quaternion;
  braceAxis: Vector3;
  /**
   * The two turning nodes as DELIVERED.
   *
   * `hinge_on` gives each its own rotation — that is how local X came to be the
   * hinge line — so writing an absolute rotation throws the hinge away and lays
   * the member flat in the boat's own axes. The delivered quaternion is the zero
   * of the angle. `pxlLids` documents the same trap; this file fell into it.
   */
  aftRest: Quaternion;
  fwdRest: Quaternion;
  /**
   * THE CANVAS, SKINNED TO THE THREE BOWS.
   *
   * It used to be rigid and simply hidden at the end, which is a jump: the
   * frame gathered and the cloth stood still over it until it vanished. Cloth
   * does not do that. So every canvas vertex is weighted between the three
   * bows by its station and carried by their transforms — a linear blend, which
   * is not a rigid motion and should not be, because canvas is not rigid.
   */
  canvasRest: Float32Array | null;
  canvasW: Float32Array | null;
  aftRestM: Matrix4;
  fwdRestM: Matrix4;
}

export function createStowState(): PxlStowState {
  return {
    stowed: false, t: 0, primed: false,
    braceFoot: new Vector3(), braceHead: new Vector3(),
    braceFootRest: new Vector3(), braceLength: 0,
    midRest: new Vector3(), bootRest: new Vector3(),
    braceRest: new Quaternion(), braceAxis: new Vector3(0, 1, 0),
    aftRest: new Quaternion(), fwdRest: new Quaternion(),
    canvasRest: null, canvasW: null,
    aftRestM: new Matrix4(), fwdRestM: new Matrix4(),
  };
}

/** Strike the top, or set it up again. */
export function toggleStow(state: PxlStowState): void {
  state.stowed = !state.stowed;
}

const _a = new Vector3();
const _b = new Vector3();
const _q = new Quaternion();
const _p = new Vector3();
const _mA = new Matrix4();
const _mB = new Matrix4();
const _mC = new Matrix4();
const _axis = new Vector3(0, 0, 1);

function endsOf(mesh: Mesh): [Vector3, Vector3] {
  const p = mesh.geometry.getAttribute("position");
  let lo = new Vector3(), hi = new Vector3();
  let loY = Infinity, hiY = -Infinity;
  for (let i = 0; i < p.count; i += 1) {
    const y = p.getY(i);
    if (y < loY) { loY = y; lo.set(p.getX(i), y, p.getZ(i)); }
    if (y > hiY) { hiY = y; hi.set(p.getX(i), y, p.getZ(i)); }
  }
  return [lo, hi];
}

/**
 * Measure the linkage off the model. Called when it resolves, like `primeLids`.
 *
 * The brace's two ends are its lowest and highest vertices — it is a straight
 * tube and nothing else is in that node. The lower one is converted into the
 * AFTER node's own frame, so that turning that node carries it without this
 * file knowing where the hinge is or which way it runs.
 */
export function primeStow(
  state: PxlStowState,
  node: (zone: PxlZone) => { mesh: Mesh } | null,
): void {
  state.primed = false;
  state.stowed = false;
  state.t = 0;

  const brace = node("bimini_brace");
  const aft = node("bimini_aft");
  const mid = node("bimini_mid");
  const boot = node("bimini_boot");
  if (!brace || !aft || !mid) return;

  for (const zone of PXL_STOW_ZONES) {
    const handle = node(zone);
    if (handle) handle.mesh.frustumCulled = false;
  }

  /* EVERYTHING IN THE PARENT'S FRAME, not the world's. These nodes are
     siblings under the vessel, and the vessel itself is moved and scaled by the
     scene; mixing the two frames is what threw the brace into the sky the first
     time this was tried. `matrix` is the node's own, `matrixWorld` is not. */
  aft.mesh.updateMatrix();
  const [foot, head] = endsOf(brace.mesh);
  state.braceLength = foot.distanceTo(head);
  state.braceHead.copy(head);
  state.braceFootRest.copy(foot);
  state.braceFoot.copy(foot).applyMatrix4(aft.mesh.matrix.clone().invert());
  state.braceRest.copy(brace.mesh.quaternion);
  state.braceAxis.copy(head).sub(foot).normalize();
  state.aftRest.copy(aft.mesh.quaternion);
  const fwd = node("bimini_fwd");
  if (fwd) state.fwdRest.copy(fwd.mesh.quaternion);
  state.midRest.copy(mid.mesh.position);
  if (boot) state.bootRest.copy(boot.mesh.position);

  /* The canvas's rest pose and its weights. Three bows, so three weights per
     vertex, held as one interleaved array: aft, middle, forward. The station of
     the middle bow is read off that node rather than written down here. */
  const canopy = node("bimini_canopy");
  const fwdN = node("bimini_fwd");
  if (canopy && fwdN) {
    mid.mesh.geometry.computeBoundingBox();
    const midBox = mid.mesh.geometry.boundingBox;
    const attr = canopy.mesh.geometry.getAttribute("position");
    const rest = new Float32Array(attr.array as ArrayLike<number>);
    const w = new Float32Array(attr.count * 3);
    let x0 = Infinity, x1 = -Infinity;
    for (let i = 0; i < attr.count; i += 1) {
      x0 = Math.min(x0, rest[i * 3]);
      x1 = Math.max(x1, rest[i * 3]);
    }
    const xm = midBox ? (midBox.min.x + midBox.max.x) / 2 : (x0 + x1) / 2;
    for (let i = 0; i < attr.count; i += 1) {
      const x = rest[i * 3];
      if (x <= xm) {
        const a = MathUtils.clamp((xm - x) / Math.max(xm - x0, 1e-4), 0, 1);
        w[i * 3] = a; w[i * 3 + 1] = 1 - a; w[i * 3 + 2] = 0;
      } else {
        const f = MathUtils.clamp((x - xm) / Math.max(x1 - xm, 1e-4), 0, 1);
        w[i * 3] = 0; w[i * 3 + 1] = 1 - f; w[i * 3 + 2] = f;
      }
    }
    state.canvasRest = rest;
    state.canvasW = w;
    canopy.mesh.geometry.getAttribute("position").needsUpdate = true;
  }
  aft.mesh.updateMatrix();
  state.aftRestM.copy(aft.mesh.matrix);
  if (fwdN) { fwdN.mesh.updateMatrix(); state.fwdRestM.copy(fwdN.mesh.matrix); }
  state.primed = true;
}

/** Ease toward the asked-for state. True while it is still moving. */
export function tickStow(state: PxlStowState, delta: number): boolean {
  const target = state.stowed ? 1 : 0;
  const moving = Math.abs(state.t - target) > EPSILON;
  state.t = moving ? MathUtils.damp(state.t, target, 1 / SETTLE, delta) : target;
  return moving;
}

/**
 * Write the state onto the model, on top of whatever the configuration said.
 *
 * `fitted` decides whether there is a bimini at all; this only decides what
 * shape it is in.
 */
export function applyStow(
  state: PxlStowState,
  node: (zone: PxlZone) => { mesh: Mesh } | null,
  fitted: boolean,
): void {

  const boot = node("bimini_boot");
  for (const zone of PXL_STOW_ZONES) {
    const handle = node(zone);
    if (!handle) continue;
    handle.mesh.visible =
      fitted
      && (zone === "bimini_canopy" ? state.t < CANVAS_OUT
        : zone === "bimini_boot" ? state.t > BOOT_IN
        : zone === "bimini_strap" ? state.t < 0.02
        : true);
  }
  if (!state.primed) return;

  const angle = SWING * state.t;
  const aft = node("bimini_aft");
  const fwd = node("bimini_fwd");
  const mid = node("bimini_mid");
  const brace = node("bimini_brace");
  if (!aft || !fwd || !mid || !brace) return;

  /* The two turning members. Each was re-origined onto the fitting it stands
     on, so this is the whole of their motion. */
  for (const [member, rest] of [[aft, state.aftRest], [fwd, state.fwdRest]] as const) {
    member.mesh.quaternion.copy(rest);
    member.mesh.rotateX(angle);
  }
  aft.mesh.updateMatrix();
  fwd.mesh.updateMatrix();

  /* Where the brace's foot has been carried to. */
  const footNow = _a.copy(state.braceFoot).applyMatrix4(aft.mesh.matrix);

  /* And how far the middle bow must rise to keep the brace its own length.
     One equation, one unknown: |head + (0, d, 0) − foot| = L. */
  const dx = state.braceHead.x - footNow.x;
  const dz = state.braceHead.z - footNow.z;
  const flat = state.braceLength * state.braceLength - dx * dx - dz * dz;
  const rise = flat > 0
    ? Math.max(0, footNow.y + Math.sqrt(flat) - state.braceHead.y)
    : 0;

  mid.mesh.position.set(state.midRest.x, state.midRest.y + rise, state.midRest.z);
  if (boot) {
    boot.mesh.position.set(state.bootRest.x, state.bootRest.y + rise,
                           state.bootRest.z);
  }

  /* The brace itself: the rotation that takes its rest direction to the one its
     two ends now describe, and the offset that puts its foot back on the strut. */
  const headNow = _b.set(state.braceHead.x, state.braceHead.y + rise,
                         state.braceHead.z);
  /* IN THE x–y PLANE ONLY, and that is what makes the two sides agree.
     `bimini_brace` holds BOTH braces — they are mirror images about the
     centreline — and the first version solved one rigid transform from the
     endpoints of ONE of them. A general rotation has a component athwartships,
     so it placed the sampled side and dragged the other one off its strut: the
     port brace moved differently and its foot hung past the tube.
     Every part of this motion is in the boat's fore-and-aft section, so the
     turn is about Z and the shift has no z in it. Applied to the node, that is
     the same motion for both braces, each about its own side. */
  const restDx = state.braceHead.x - state.braceFootRest.x;
  const restDy = state.braceHead.y - state.braceFootRest.y;
  const nowDx = headNow.x - footNow.x;
  const nowDy = headNow.y - footNow.y;
  const turn = Math.atan2(restDx * nowDy - restDy * nowDx,
                          restDx * nowDx + restDy * nowDy);
  _q.setFromAxisAngle(_axis, turn);
  brace.mesh.quaternion.copy(_q);
  const restFoot = _p.copy(state.braceFootRest).applyQuaternion(_q);
  brace.mesh.position.set(footNow.x - restFoot.x, footNow.y - restFoot.y, 0);

  /* ── the canvas ────────────────────────────────────────────────────────
     Skinned to the three bows: each vertex is carried by a weighted blend of
     the transforms the bows themselves are under. A blend of rigid motions is
     not rigid, and that is right — this is cloth, and what it should do as the
     frame closes is gather, not hold its shape and then disappear. */
  const canopy = node("bimini_canopy");
  if (canopy && state.canvasRest && state.canvasW) {
    const A = _mA.copy(aft.mesh.matrix).multiply(_mB.copy(state.aftRestM).invert());
    const F = _mB.copy(fwd.mesh.matrix).multiply(_mC.copy(state.fwdRestM).invert());
    const attr = canopy.mesh.geometry.getAttribute("position");
    const out = attr.array as Float32Array;
    const rest = state.canvasRest, w = state.canvasW;
    for (let i = 0; i < attr.count; i += 1) {
      const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
      const wa = w[i * 3], wm = w[i * 3 + 1], wf = w[i * 3 + 2];
      let ox = 0, oy = 0, oz = 0;
      if (wa > 0) {
        _p.set(x, y, z).applyMatrix4(A);
        ox += wa * _p.x; oy += wa * _p.y; oz += wa * _p.z;
      }
      if (wm > 0) { ox += wm * x; oy += wm * (y + rise); oz += wm * z; }
      if (wf > 0) {
        _p.set(x, y, z).applyMatrix4(F);
        ox += wf * _p.x; oy += wf * _p.y; oz += wf * _p.z;
      }
      out[i * 3] = ox; out[i * 3 + 1] = oy; out[i * 3 + 2] = oz;
    }
    attr.needsUpdate = true;
  }
}
