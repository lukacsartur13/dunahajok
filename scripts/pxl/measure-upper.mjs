/**
 * PXL — measuring the UPPER BOAT off the delivered plates.  PHASE 4.3.
 *
 *     node scripts/pxl/measure-upper.mjs            # print the table
 *     node scripts/pxl/measure-upper.mjs --write    # …and write the JSON
 *
 * Phase 4.2 measured the hull and got it right. It measured nothing above the
 * sheer, and §30 of the 4.3 brief is that a silhouette rasteriser cannot see
 * the difference between the delivered console and a wedge. So this is the
 * missing half: every landmark of the helm, the seating and the rails, read off
 * the plates and expressed in the model's own metres.
 *
 * ── THE CALIBRATION IS NOT NEW ────────────────────────────────────────────
 *
 * `PXL_SIDE_PLATE` already pins the July side plate to the model: 345.1 plate
 * pixels per metre, the transom at column 699, the sheer maximum at row 796.
 * Everything below is that same mapping applied above the deck line instead of
 * below it, so a landmark measured here and a hull station measured by
 * `reference-qa.mjs` are in one coordinate system by construction.
 *
 *     x = −2.6266 + (col − 699) / 345.1          bow positive
 *     z =  0.9428 − (row − 796) / 345.1          up positive, waterline 0
 *
 * ── WHAT IS SEPARATED, AND HOW ────────────────────────────────────────────
 *
 * The plate carries four things above the sheer and they have to be told apart
 * before any of them can be measured:
 *
 *   STRUCTURE   the console and the windscreen frame — dark, value under 0.62
 *   ACCENT      the rails and the seat — orange, hue 15–45°, saturation > 0.30
 *   FIGURE      the human — a near-white wash, value over 0.86, saturation ~0
 *   PAPER       everything else
 *
 * The figure is the one that matters. It stands directly behind the helm and
 * overlaps it in projection, so a plain "not white" mask makes the console
 * 0.42 m longer than it is and puts its top 0.31 m too high. Thresholding on
 * VALUE rather than on difference-from-white separates them cleanly, because
 * the drawing renders the person as a translucent ghost and the console as
 * near-black — there is a two-thirds gap between them and nothing in it.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
 *
 * It is not a tracer. It reports extents, heights and runs — the numbers a
 * parametric rebuild needs — and it does not attempt to recover an outline that
 * would then be extruded, because a 2D trace extruded is exactly the "distort
 * the model into a 2D trace" §29 rules out. The three-quarter plates decide the
 * plan; this decides the profile.
 */

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SIDE = path.join(ROOT, "assets", "source", "pxl", "pxl-side-20240719.jpg");
const OUT = path.join(ROOT, "assets", "derived", "pxl", "PXL.upper.json");

/* ── The calibration, from `pxlReference.PXL_SIDE_PLATE` ──────────────────*/

const PX_PER_M = 345.1;
const TRANSOM_PX = 699;
const SHEER_PX = 796;
const TRANSOM_X = -2.6266;
const SHEER_Z = 0.9428;

const toX = (col) => TRANSOM_X + (col - TRANSOM_PX) / PX_PER_M;
const toZ = (row) => SHEER_Z - (row - SHEER_PX) / PX_PER_M;
const toM = (px) => px / PX_PER_M;

/* ── Classification ───────────────────────────────────────────────────────*/

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return [(h + 360) % 360, max === 0 ? 0 : d / max, max / 255];
}

/**
 * Dark structure: the console shell, the screen frame, the capping.
 *
 * 0.62 is not a round number chosen for tidiness. The plate's helm structure
 * peaks at value 0.44 and its human figure bottoms out at 0.87; the gap is
 * empty, and the threshold sits in the middle of it with room on both sides.
 */
const isStructure = (h, s, v) => v < 0.62 && !(s > 0.30 && h >= 15 && h <= 45);
const isAccent = (h, s, v) => s > 0.30 && h >= 12 && h <= 48 && v > 0.30;
const isFigure = (h, s, v) => v >= 0.62 && v < 0.985 && s < 0.10;

/* ── Plate ────────────────────────────────────────────────────────────────*/

const image = sharp(SIDE);
const meta = await image.metadata();
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const CH = info.channels;

const at = (col, row) => {
  const i = (row * W + col) * CH;
  return hsv(data[i], data[i + 1], data[i + 2]);
};

/**
 * Column sweep over a band of rows, returning the first and last row that
 * matches, and the run count.
 */
function column(col, test, row0, row1) {
  let first = -1;
  let last = -1;
  let n = 0;
  for (let row = row0; row <= row1; row += 1) {
    const [h, s, v] = at(col, row);
    if (!test(h, s, v)) continue;
    if (first < 0) first = row;
    last = row;
    n += 1;
  }
  return { first, last, n };
}

/* ── The deck line ────────────────────────────────────────────────────────
 *
 * The datum every height in this file is measured from, and the one thing that
 * has to be found before anything else can be.
 *
 * FITTED FROM THE CLEAN COLUMNS, NOT READ AT EVERY COLUMN. The obvious
 * approach — take the topmost dark run in each column — fails in both
 * directions at once. Where the helm stands, the topmost dark run IS the helm,
 * so the deck line reads 0.4 m too high and the console measures as nothing.
 * Where the black bottom is thicker than the capping, a "thickest run" rule
 * picks the bottom instead and the deck line reads 0.6 m too low, which is what
 * put the console's fore-aft extent at 3.7 m on the first run — the capping
 * band itself was being counted as furniture over the whole boat.
 *
 * A column is CLEAN when, searching from `DECK_CEILING` down, its first dark
 * run is at least 12 px thick and has 25 px of clear air above it: that is the
 * capping band with the sky over it.
 *
 * BOTH HALVES OF THAT TEST ARE LOAD-BEARING, and each was added because the
 * other one alone gave a wrong answer:
 *
 *   • Without the ceiling, the windscreen's own top rail is a 28 px dark run
 *     with paper above it, so it passes — and the fitted deck line at the helm
 *     came out at row 662 instead of 805, which is 0.41 m of pure error placed
 *     exactly where the phase is looking hardest.
 *   • Without the clear-air test, the ceiling alone is not enough: the console
 *     runs down past it to the deck, so the first run below row 786 at the helm
 *     is the console's own skirt.
 *
 * `DECK_CEILING` is not a tuned number. Row 796 is the plate's highest sheer BY
 * DEFINITION — it is the calibration datum `PXL_SIDE_PLATE.sheerPx`, the row the
 * whole coordinate system is pinned to — so no deck edge anywhere on the boat
 * can be above it. Ten pixels of slack for the drawing's line weight puts the
 * ceiling at 786.
 */
const DECK_CEILING = 786;

const DECK = (() => {
  const raw = new Array(W).fill(-1);
  const clear = (col, from) => {
    let n = 0;
    for (let row = from - 25; row < from; row += 1) {
      const [h, s, v] = at(col, Math.max(0, row));
      if (!isStructure(h, s, v)) n += 1;
    }
    return n >= 22;
  };
  for (let col = 700; col <= 2600; col += 1) {
    let start = -1;
    for (let row = DECK_CEILING; row <= 1400; row += 1) {
      const [h, s, v] = at(col, row);
      const dark = isStructure(h, s, v);
      if (dark && start < 0) start = row;
      if (!dark && start >= 0) {
        if (row - start >= 12 && clear(col, start)) raw[col] = start;
        break;
      }
    }
  }
  /* Interpolate the gaps, then take a wide median to shed the columns where a
     rail's shadow or the figure's foot happened to satisfy the test. */
  const known = [];
  for (let col = 0; col < W; col += 1) if (raw[col] >= 0) known.push(col);
  if (!known.length) throw new Error("no clean deck columns found");
  const filled = new Array(W).fill(-1);
  for (let col = known[0]; col <= known[known.length - 1]; col += 1) {
    if (raw[col] >= 0) { filled[col] = raw[col]; continue; }
    let a = col; while (a >= 0 && raw[a] < 0) a -= 1;
    let b = col; while (b < W && raw[b] < 0) b += 1;
    if (a < 0 || b >= W) continue;
    filled[col] = raw[a] + ((raw[b] - raw[a]) * (col - a)) / (b - a);
  }
  const smooth = filled.slice();
  const K = 40;
  for (let col = known[0]; col <= known[known.length - 1]; col += 1) {
    const w = [];
    for (let i = col - K; i <= col + K; i += 1) if (filled[i] >= 0) w.push(filled[i]);
    if (w.length) { w.sort((p, q) => p - q); smooth[col] = w[w.length >> 1]; }
  }
  return { raw, smooth, first: known[0], last: known[known.length - 1] };
})();

function deckLine(col) {
  return col >= DECK.first && col <= DECK.last ? DECK.smooth[col] : -1;
}

/* ── 1 · The helm ─────────────────────────────────────────────────────────*/

/** Every dark run in a column, as [startRow, length]. */
function darkRuns(col, row0, row1) {
  const runs = [];
  let start = -1;
  for (let row = row0; row <= row1; row += 1) {
    const [h, s, v] = at(col, row);
    const dark = isStructure(h, s, v);
    if (dark && start < 0) start = row;
    if ((!dark || row === row1) && start >= 0) {
      if (row - start >= 2) runs.push([start, row - start]);
      start = -1;
    }
  }
  return runs;
}

/**
 * The helm, column by column, above the deck edge.
 *
 * THE ONE STRUCTURE HAS TWO TOPS AND BOTH ARE NEEDED. The screen's top rail and
 * the console's top edge appear in a column as two separate dark runs with the
 * glazing between them — at x −0.31 they are rows 654–663 and 754–790, and the
 * 91 rows between are the plate's own light. So the topmost run gives the
 * SCREEN and the run nearest the deck gives the CONSOLE, and where the two
 * merge into one tall run the column is on a frame post and reports the same
 * value for both, which is correct.
 *
 * The clearance below the deck line is 14 px rather than 0: the capping band is
 * dark, and a rule that took every dark pixel above the fitted sheer would call
 * the capping a console for the whole length of the boat.
 */
function helmProfile() {
  const columns = [];
  for (let col = 900; col <= 2300; col += 1) {
    const deck = deckLine(col);
    if (deck < 0) continue;
    const runs = darkRuns(col, 300, Math.round(deck) - 14);
    /* Twenty dark pixels of standing structure. The rails are drawn with a
       dark outline two or three pixels thick and would otherwise register as a
       0.4 m console running the length of the cockpit — which is exactly what
       the first version of this file reported. */
    const ink = runs.reduce((a, r) => a + r[1], 0);
    if (ink < 20) continue;
    columns.push({
      col, deck,
      screenTop: runs[0][0],
      consoleTop: runs[runs.length - 1][0],
      ink,
    });
  }
  return columns;
}

const helm = helmProfile();

/** Split into connected groups, so the wheel is not averaged into the console. */
function groupColumns(cols, gap = 6) {
  const out = [];
  for (const c of cols) {
    const last = out[out.length - 1];
    if (last && c.col - last[last.length - 1].col <= gap) last.push(c);
    else out.push([c]);
  }
  return out;
}

const helmGroups = groupColumns(helm);
/* The console is the largest group; anything aft of it that is smaller is the
   wheel, which stands clear of the console's aft face in the drawing. */
const consoleGroup = helmGroups.reduce((a, b) => (b.length > a.length ? b : a), helmGroups[0] ?? []);
const wheelGroup = helmGroups
  .filter((g) => g !== consoleGroup && g[0].col < consoleGroup[0]?.col)
  .sort((a, b) => b.length - a.length)[0] ?? null;

function span(cols, key) {
  if (!cols || !cols.length) return null;
  const c0 = cols[0].col;
  const c1 = cols[cols.length - 1].col;
  const rows = cols.map((c) => c[key]);
  const apex = Math.min(...rows);
  const apexCol = cols[rows.indexOf(apex)].col;
  const deckAtApex = cols[rows.indexOf(apex)].deck;
  return {
    x0: toX(c0), x1: toX(c1), length: toM(c1 - c0),
    apexZ: toZ(apex), apexX: toX(apexCol),
    aboveDeck: toM(deckAtApex - apex),
    aftZ: toZ(cols[0][key]), fwdZ: toZ(cols[cols.length - 1][key]),
    deckZ: toZ(deckAtApex),
    cols: [c0, c1],
  };
}

/* ── 2 · The accents ──────────────────────────────────────────────────────*/

/**
 * Every orange run on the plate, as connected column groups.
 *
 * The rails, the coaming inlay and the seat squab are all this colour, and
 * they separate by HEIGHT ABOVE THE DECK rather than by hue: the inlay rides
 * the deck edge, the rails stand 0.1–0.2 m over it, and the squab is a solid
 * block rather than a line.
 */
function accentRuns() {
  const runs = [];
  for (let col = 700; col <= 2600; col += 1) {
    const deck = deckLine(col);
    if (deck < 0) continue;
    let start = -1;
    for (let row = 300; row <= deck + 4; row += 1) {
      const [h, s, v] = at(col, row);
      const on = isAccent(h, s, v);
      if (on && start < 0) start = row;
      if ((!on || row === deck + 4) && start >= 0) {
        if (row - start >= 2) {
          runs.push({ col, top: start, bottom: row - 1, thick: row - start,
                      above: deck - start, deck });
        }
        start = -1;
      }
    }
  }
  return runs;
}

const accents = accentRuns();

/** Group runs into parts: contiguous columns at a similar height. */
function groupRuns(runs, gapCols = 6, gapRows = 14) {
  const byCol = new Map();
  for (const r of runs) {
    if (!byCol.has(r.col)) byCol.set(r.col, []);
    byCol.get(r.col).push(r);
  }
  const cols = [...byCol.keys()].sort((a, b) => a - b);
  const parts = [];
  for (const col of cols) {
    for (const r of byCol.get(col)) {
      const host = parts.find((p) =>
        col - p.lastCol <= gapCols && Math.abs(r.top - p.lastTop) <= gapRows);
      if (host) {
        host.runs.push(r);
        host.lastCol = col;
        host.lastTop = r.top;
      } else {
        parts.push({ runs: [r], lastCol: col, lastTop: r.top });
      }
    }
  }
  return parts
    .map((p) => {
      const c0 = Math.min(...p.runs.map((r) => r.col));
      const c1 = Math.max(...p.runs.map((r) => r.col));
      const top = Math.min(...p.runs.map((r) => r.top));
      const bot = Math.max(...p.runs.map((r) => r.bottom));
      const above = p.runs.reduce((a, r) => a + r.above, 0) / p.runs.length;
      return {
        x0: toX(c0), x1: toX(c1), length: toM(c1 - c0),
        topZ: toZ(top), bottomZ: toZ(bot), thickness: toM(bot - top),
        aboveDeck: toM(above), n: p.runs.length, cols: [c0, c1],
      };
    })
    .filter((p) => p.length > 0.04)
    .sort((a, b) => a.x0 - b.x0);
}

const parts = groupRuns(accents);

/* ── 3 · The human, for scale validation (§26) ────────────────────────────*/

function figure() {
  let c0 = 1e9; let c1 = -1e9; let r0 = 1e9; let r1 = -1e9;
  let n = 0;
  for (let col = 1000; col <= 1500; col += 1) {
    for (let row = 300; row <= 900; row += 1) {
      const [h, s, v] = at(col, row);
      if (!isFigure(h, s, v)) continue;
      n += 1;
      if (col < c0) c0 = col; if (col > c1) c1 = col;
      if (row < r0) r0 = row; if (row > r1) r1 = row;
    }
  }
  if (!n) return null;
  return {
    headZ: toZ(r0), lowestVisibleZ: toZ(r1),
    x0: toX(c0), x1: toX(c1),
    heightVisible: toM(r1 - r0), pixels: n,
  };
}

const person = figure();

/* ── Report ───────────────────────────────────────────────────────────────*/

/**
 * The console's top edge, measured only where the glazing is OPEN.
 *
 * A column through a frame post carries one dark run from the screen's top rail
 * all the way down to the console, so `consoleTop` and `screenTop` are the same
 * row there and the console appears to be 0.35 m tall. The columns that mean
 * anything are the ones the drawing shows daylight through: there the two runs
 * are separate, and the lower one is the dash.
 */
const openCols = consoleGroup.filter((c) => c.screenTop !== c.consoleTop);
const consoleTop = (() => {
  if (!openCols.length) return null;
  const zs = openCols.map((c) => toZ(c.consoleTop)).sort((a, b) => a - b);
  const deck = openCols.reduce((a, c) => a + c.deck, 0) / openCols.length;
  return {
    x0: toX(openCols[0].col), x1: toX(openCols[openCols.length - 1].col),
    aftZ: toZ(openCols[0].consoleTop),
    fwdZ: toZ(openCols[openCols.length - 1].consoleTop),
    medianZ: zs[zs.length >> 1],
    deckZ: toZ(deck),
    aboveDeck: zs[zs.length >> 1] - toZ(deck),
    n: openCols.length,
  };
})();

const shell = span(consoleGroup, "consoleTop");
const screen = span(consoleGroup, "screenTop");
const wheel = span(wheelGroup, "screenTop");

const round = (o, d = 3) =>
  JSON.parse(JSON.stringify(o, (k, v) =>
    typeof v === "number" && !Number.isInteger(v) ? Number(v.toFixed(d)) : v));

const report = {
  plate: { file: path.relative(ROOT, SIDE), width: meta.width, height: meta.height },
  calibration: { pxPerMetre: PX_PER_M, transomPx: TRANSOM_PX, sheerPx: SHEER_PX },
  console: consoleTop,
  helmEnvelope: shell,
  screen,
  wheel,
  accents: parts,
  figure: person,
};

console.log(`\n  PXL — upper-boat landmarks from ${path.basename(SIDE)}\n`);
console.log(`  ${meta.width} × ${meta.height}, ${PX_PER_M} px/m\n`);

const fmt = (v) => (v === null || v === undefined ? "    —" : v.toFixed(3).padStart(7));

function report3(name, s) {
  if (!s) return;
  console.log(`  ${name}`);
  console.log(`    fore-aft      x ${fmt(s.x0)} → ${fmt(s.x1)}   (${fmt(s.length)} m)`);
  console.log(`    apex          z ${fmt(s.apexZ)} at x ${fmt(s.apexX)}   ` +
              `${fmt(s.aboveDeck)} m above the deck (z ${fmt(s.deckZ)})`);
  console.log(`    aft → fwd     z ${fmt(s.aftZ)} → ${fmt(s.fwdZ)}`);
}
if (consoleTop) {
  console.log("  CONSOLE — dash, where the glazing is open");
  console.log(`    fore-aft      x ${fmt(consoleTop.x0)} → ${fmt(consoleTop.x1)}   (${consoleTop.n} columns)`);
  console.log(`    top           z ${fmt(consoleTop.medianZ)} median   ` +
              `${fmt(consoleTop.aboveDeck)} m above the deck (z ${fmt(consoleTop.deckZ)})`);
  console.log(`    aft → fwd     z ${fmt(consoleTop.aftZ)} → ${fmt(consoleTop.fwdZ)}`);
}
report3("HELM ENVELOPE — console shell plus posts", shell);
report3("SCREEN — top edge", screen);
report3("WHEEL — standing clear aft of the console", wheel);
console.log("\n  ORANGE PARTS  (rails · inlay · squab)");
console.log("      x0       x1    length  top z   thick  above deck   n");
for (const p of parts) {
  console.log(`  ${fmt(p.x0)}  ${fmt(p.x1)}  ${fmt(p.length)}  ${fmt(p.topZ)}  ${fmt(p.thickness)}  ${fmt(p.aboveDeck)}  ${String(p.n).padStart(5)}`);
}
if (person) {
  console.log("\n  HUMAN FIGURE  (§26 scale check)");
  console.log(`    head          z ${fmt(person.headZ)}`);
  console.log(`    lowest seen   z ${fmt(person.lowestVisibleZ)}`);
  console.log(`    station       x ${fmt(person.x0)} → ${fmt(person.x1)}`);
}

if (process.argv.includes("--write")) {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(round(report), null, 2));
  console.log(`\n  wrote ${path.relative(ROOT, OUT)}`);
}
console.log();
