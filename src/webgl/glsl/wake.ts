/**
 * THE DUNA WAKE.
 *
 * This is the signature of the whole phase, so it is authored rather than
 * simulated. There is no fluid solver here and there does not need to be one:
 * a real displacement wake is a *stationary* pattern in the hull's frame, and
 * the shape of that pattern has been known since Kelvin. It is a set of
 * diverging arms inside a fixed half-angle, filled with transverse crests
 * whose curvature comes from the stationary-phase condition. Evaluate that
 * closed form per fragment and you get a wake that is physically plausible in
 * every frame, for the price of a few dozen instructions and no state at all.
 *
 * What makes it Duna rather than generic:
 *
 *   • THREE PAIRS OF ARMS, at 0.29 / 0.67 / 1.00 of the Kelvin half-angle,
 *     carrying the opacity ramp 1.00 / 0.87 / 0.74. Those are exactly the six
 *     curves and exactly the ramp of the Phase One <WakeLine> SVG. The 3D wake
 *     is not "like" the site's graphic motif; it is the same drawing, solved
 *     in world space.
 *   • THE DIVERGENCE PROFILE is `s^0.78`, not a straight line — the arms leave
 *     the stern tight and open late, which is the concave attack of the
 *     authored SVG curves and of the hull's own sheer.
 *   • LINEIFY. At the end of the hero the arms narrow to a constant *screen*
 *     width and shift from foam to hairline. The physical wake becomes the
 *     graphic wake, and hands the page over to the DOM.
 *
 * Coordinates: `u` runs astern from the transom along the wake axis, `v` is
 * lateral. Everything is in metres, so a 6.1 m boat throws a 6.1 m boat's wake.
 *
 * Derivatives are analytic. Finite-differencing this field would mean
 * evaluating it three times per fragment for a normal, and the closed form is
 * short enough to differentiate by hand:
 *
 *   a(u)  = K·L·s^0.78                    arm offset,  s = u/L
 *   w(u)  = w0 + (w1−w0)·s                arm width
 *   q     = (|v| − a)/w
 *   E     = exp(−q²)                      the crest itself
 *   ∂E/∂v = −2q·sign(v)/w · E
 *   ∂E/∂u = 2q·(a′ + q·w′)/w · E          (using |v| − a = q·w)
 */

export const WAKE_GLSL = /* glsl */ `
uniform vec2  uWakeOrigin;    // transom, world XZ
uniform vec2  uWakeAxis;      // unit vector pointing astern
uniform float uWakeLength;    // metres of wake behind the transom
uniform float uWakeSpeed;     // 0 at rest, 1 at cruising — drives everything
uniform float uWakeLift;      // master amplitude, in metres
uniform float uLineify;       // 0 physical wake, 1 graphic hairlines
uniform float uLinePixelScale;// metres-per-pixel at unit distance
uniform vec3  uFoamColor;
uniform vec3  uLineColor;

/** tan(19.47°) — the Kelvin half-angle, and the outermost Duna arm. */
const float WAKE_KELVIN = 0.35355;
/** Arm placement and opacity, lifted from the Phase One WakeLine geometry. */
const vec3  WAKE_ARM_K  = vec3(0.29, 0.67, 1.00) * WAKE_KELVIN;
const vec3  WAKE_ARM_OP = vec3(1.00, 0.87, 0.74);

struct WakeSample {
  float height;   // metres of displacement
  vec2  slope;    // d(height)/d(world x, z)
  float foam;     // 0–1 whitewater coverage
  float line;     // 0–1 graphic hairline coverage
};

WakeSample dunaWake(vec2 world, float time, float detail) {
  WakeSample o;
  o.height = 0.0;
  o.slope = vec2(0.0);
  o.foam = 0.0;
  o.line = 0.0;

  if (uWakeSpeed <= 0.001) return o;

  vec2 axis = uWakeAxis;
  vec2 side = vec2(-axis.y, axis.x);
  vec2 rel  = world - uWakeOrigin;

  float u = dot(rel, axis);
  float v = dot(rel, side);
  float L = uWakeLength;

  // ── The bow wave ───────────────────────────────────────────────────────
  // Ahead of the transom the hull is still pushing water aside. One compact
  // crest, so the vessel is not simply pasted onto a flat surface.
  if (u < 0.0) {
    float bow = exp(-(u * u) * 0.06 - (v * v) * 0.10);
    o.height += bow * uWakeLift * 0.55 * uWakeSpeed;
    o.foam += bow * 0.30 * uWakeSpeed;
    return o;
  }
  if (u > L) return o;

  float s = clamp(u / L, 0.012, 1.0);
  float invL = 1.0 / L;

  // ── Three pairs of diverging arms ──────────────────────────────────────
  //
  // Width matters more than anything else here. The arms sit at 0.29 / 0.67 /
  // 1.00 of the Kelvin angle, which a third of the way down the wake puts
  // roughly 1.4 m of clear water between neighbours. Let each arm grow wider
  // than that gap and the three merge into one aerated wedge — physically
  // defensible, and the exact moment the wake stops being the Duna drawing and
  // becomes a generic patch of white behind a boat. Kept under the gap, the
  // six curves stay six curves all the way out.
  float widthNear = 0.30;
  float widthFar  = 1.05;
  float w      = widthNear + (widthFar - widthNear) * s;
  float dwdu   = (widthFar - widthNear) * invL;

  // Energy dies out along the wake: linear taper × exponential decay.
  //
  // The exponent is a look, not a measurement. A real displacement wake loses
  // amplitude roughly as u^-1/3 and persists for hundreds of metres; decaying
  // it steeply enough to be "safe" leaves foam on only the first few metres,
  // and then the V — the entire point of the feature — never opens where the
  // camera can see it. 1.15 keeps the arms legible across the authored length
  // and lets the length itself, which is choreographed, control the reach.
  float decay  = (1.0 - s) * exp(-1.15 * s);
  float ddecay = (-1.0 - 1.15 * (1.0 - s)) * exp(-1.15 * s) * invL;

  // A hairline that holds a constant width on screen, whatever the distance.
  //
  // Measured from the CAMERA, not from the transom: what a hairline has to
  // stay constant against is how far away it is from the eye. uLinePixelScale
  // is metres-per-pixel at one metre, recomputed each frame from the live
  // field of view and the band's real pixel height — so the graphic wake is
  // the same weight as the DOM's 1px SVG stroke on a phone and on a laptop.
  float lineW = clamp(
    uLinePixelScale * distance(vec3(world.x, 0.0, world.y), cameraPosition),
    0.008,
    0.4
  );
  float sv = v < 0.0 ? -1.0 : 1.0;
  float av = abs(v);

  float armOuter = WAKE_ARM_K.z * L * pow(s, 0.78);

  for (int k = 0; k < 3; k++) {
    float K  = k == 0 ? WAKE_ARM_K.x : (k == 1 ? WAKE_ARM_K.y : WAKE_ARM_K.z);
    float op = k == 0 ? WAKE_ARM_OP.x : (k == 1 ? WAKE_ARM_OP.y : WAKE_ARM_OP.z);

    float a    = K * L * pow(s, 0.78);
    float dadu = K * 0.78 * pow(s, -0.22);

    float q = (av - a) / w;
    float E = exp(-q * q);

    float amp   = uWakeLift * op * uWakeSpeed;
    float shape = E * decay;

    o.height += amp * shape;

    // ∂/∂v and ∂/∂u of E·decay, then rotated back into world axes.
    float dEdv = -2.0 * q * sv / w * E;
    float dEdu = 2.0 * q * (dadu + q * dwdu) / w * E;
    float dhdu = amp * (dEdu * decay + E * ddecay);
    float dhdv = amp * dEdv * decay;
    o.slope += axis * dhdu + side * dhdv;

    // Whitewater where the crest is steep, weighted toward the inner arms —
    // the outermost is a swell that catches light rather than a break.
    float breakable = k == 2 ? 0.34 : 1.0;
    o.foam += smoothstep(0.16, 0.70, shape) * breakable * op * uWakeSpeed;

    // The graphic register: same arms, constant screen width, no falloff into
    // foam. Only evaluated when the handoff is actually happening.
    if (uLineify > 0.001) {
      float ql = (av - a) / lineW;
      o.line += exp(-ql * ql) * op * (0.35 + 0.65 * (1.0 - s));
    }
  }

  // ── Transverse system ──────────────────────────────────────────────────
  // The curved crests that fill the V. Their phase is the stationary-phase
  // condition for a point disturbance, which is why they arc rather than run
  // straight across, and why they stretch as they move outboard.
  if (detail > 0.35) {
    float uc = max(u, 0.9);
    float kt = 6.2831853 / (2.6 + 5.0 * uWakeSpeed);
    float ph = kt * (uc + (v * v) / (2.0 * uc));
    float env = exp(-1.9 * s) * (1.0 - smoothstep(0.55, 1.0, av / max(armOuter, 0.4)));
    float amp = uWakeLift * 0.30 * uWakeSpeed * env * (1.0 - uLineify);

    o.height += amp * sin(ph);
    float dphdu = kt * (1.0 - (v * v) / (2.0 * uc * uc));
    float dphdv = kt * (v / uc);
    float c = amp * cos(ph);
    o.slope += axis * (c * dphdu) + side * (c * dphdv);
  }

  // ── The boil at the transom ────────────────────────────────────────────
  // Aerated water directly behind the hull. This is the only part of the wake
  // that is genuinely time-varying — everything above is stationary in the
  // hull's frame, as it should be.
  // Kept tight. A boil three metres across saturates the foam term over the
  // whole area the arms are trying to leave the hull from, and the wake reads
  // as a bank of fog with a boat in it rather than as water being displaced.
  float boilR = 0.85 + 1.35 * uWakeSpeed;
  float boil = exp(-((u * u) / (boilR * boilR * 2.4) + (v * v) / (boilR * boilR)));
  float churn = dunaFbm2(vec2(u * 1.5 - time * 1.3, v * 1.9 + time * 0.35));
  o.foam += boil * (0.35 + 0.6 * churn) * uWakeSpeed;
  o.height += boil * uWakeLift * 0.35 * uWakeSpeed * (churn - 0.5);

  o.foam = clamp(o.foam * (1.0 - uLineify), 0.0, 1.0);
  o.line = clamp(o.line, 0.0, 1.0);
  return o;
}
`;
