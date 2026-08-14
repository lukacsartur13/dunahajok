/**
 * GLSL SOURCE GUARDS — two of them, both for mistakes the compiler cannot see.
 *
 *   node scripts/check-glsl.mjs
 *
 * 1. NO BACKTICKS INSIDE A GLSL TEMPLATE LITERAL.
 *
 *    The shader sources live in tagged template literals, and the convention in
 *    this codebase is to document code in prose right next to it. Those two
 *    facts collide: a backtick used to quote an identifier — `uLinePixelScale`,
 *    the habit of every other comment in the project — silently terminates the
 *    template and the rest of the shader is parsed as TypeScript.
 *
 *    TypeScript does catch it, but as "',' expected" some eighty lines later,
 *    which is a genuinely bad five minutes. This says what actually happened.
 *
 * 2. NO VERTEX-ONLY THREE BUILT-IN USED FROM A FRAGMENT INJECTION.
 *
 *    ADDED IN PHASE 4.1, AFTER THIS EXACT BUG SHIPPED. `pxlGrain`'s fragment
 *    injection used `normalMatrix`, which three declares in its default VERTEX
 *    prefix and not in its fragment one. Every material carrying the interior
 *    grain — the cockpit liner and both console zones — failed to link, and the
 *    failure was invisible for a whole phase, because a scene nobody can render
 *    is a scene whose shader errors nobody reads. It surfaced within an hour of
 *    the deterministic frame mode in `pxlQa` drawing its first frame.
 *
 *    A shader compiler would have caught it in a millisecond. There isn't one
 *    here — headless GLSL validation means a native binary (glslang) or a
 *    headless GL context, and neither is a dependency this project should take
 *    on to guard a handful of injections. So this checks the one thing that
 *    actually went wrong, and checks it against the INSTALLED THREE rather than
 *    a list copied out of it: it reads the prefix arrays out of
 *    `WebGLProgram.js`, diffs the vertex declarations against the fragment ones,
 *    and treats the difference as the forbidden set. A three upgrade that moves
 *    a built-in between stages updates this guard by itself.
 *
 *    What it deliberately does NOT do is parse GLSL. It looks for a bare
 *    identifier that three declares only for the vertex stage, appearing in a
 *    fragment literal that does not declare it locally — which is precisely the
 *    shape of the bug, and nothing wider.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "src", "webgl", "glsl");
const THREE_PROGRAM = path.join(
  ROOT,
  "node_modules",
  "three",
  "src",
  "renderers",
  "webgl",
  "WebGLProgram.js",
);

/**
 * A `/* glsl *\/` template literal, with the export it is assigned to.
 *
 * The export name is what tells the second guard which STAGE a literal belongs
 * to, and it is reliable because the naming is a convention this project keeps:
 * `PXL_GRAIN_FRAGMENT_COMMON`, `PXL_GRAIN_VERTEX`. A literal whose name says
 * neither is skipped rather than guessed at — see `stageOf`.
 */
const LITERAL = /(?:export const (\w+)[^=]*= )?\/\* glsl \*\/ `([\s\S]*?)\n`;/g;

let failures = 0;

const fail = (where, message) => {
  console.error(`  ${where}\n${message}`);
  failures += 1;
};

/* ── three's own prefixes ──────────────────────────────────────────────────*/

/**
 * The identifiers three declares for each stage, read out of its source.
 *
 * The prefixes are built as array-of-string literals — `prefixVertex = [ … ]
 * .filter(filterEmptyLine).join('\n')` — so the block between the opening
 * bracket and the `].filter` is the prefix, quoting and all. There are three
 * such pairs in the file (two of them the raw-shader and the WebGL1 paths); all
 * are collected, because a name declared for the vertex stage in ANY of them
 * and never for the fragment stage in ANY of them is the set we care about.
 */
async function threeStageDeclarations() {
  let source;
  try {
    source = await readFile(THREE_PROGRAM, "utf8");
  } catch {
    return null;
  }

  /**
   * UNIFORMS ONLY, NOT ATTRIBUTES.
   *
   * three's vertex prefix also declares `position`, `normal` and `uv`, and
   * including those makes the guard useless: `normal` is the name of three's own
   * fragment-stage working normal (`normal_fragment_begin` declares it) and `uv`
   * is the most natural name for a local in any texture lookup. Both appear in
   * this project's fragment shaders, correctly, and a guard that cries about
   * them is a guard somebody deletes.
   *
   * The uniforms have no such collision, and they are the whole of the real
   * mistake — the vertex-only set is the four matrices, which is exactly the
   * group somebody reaches into a fragment shader for.
   */
  const DECL = /'\s*uniform\s+\w+\s+(\w+)/g;
  const collect = (which) => {
    const names = new Set();
    const marker = new RegExp(`prefix${which} = \\[`, "g");
    for (const at of source.matchAll(marker)) {
      const from = at.index + at[0].length;
      const to = source.indexOf("].filter", from);
      const block = source.slice(from, to < 0 ? source.length : to);
      for (const decl of block.matchAll(DECL)) names.add(decl[1]);
    }
    return names;
  };

  return { vertex: collect("Vertex"), fragment: collect("Fragment") };
}

const three = await threeStageDeclarations();

/**
 * Vertex-stage-only built-ins.
 *
 * `position`, `normal` and `uv` are in here too and that is correct: they are
 * vertex attributes, and reaching for one in a fragment shader is the same
 * mistake with a different name on it.
 */
const vertexOnly = three
  ? [...three.vertex].filter((name) => !three.fragment.has(name)).sort()
  : [];

if (!three) {
  /* Not fatal. The guard is a net, not a gate, and a missing three source —
     a pruned install, a different package layout — should not stop a build. */
  console.warn("  three's WebGLProgram.js not found; stage guard skipped.");
} else if (vertexOnly.length === 0) {
  fail(
    "scripts/check-glsl.mjs",
    "    read three's shader prefixes but found no vertex-only declarations,\n" +
      "    which means the parse is wrong rather than that the set is empty.\n" +
      "    Check the prefixVertex/prefixFragment blocks in WebGLProgram.js.",
  );
}

/**
 * Which stage a literal belongs to, by name and then by content.
 *
 * THE NAME IS NOT ENOUGH, and the bug this guard exists for is the proof: the
 * literal that used `normalMatrix` from the fragment stage is exported as
 * `PXL_GRAIN_NORMAL`, which says neither. A first version of this checker
 * matched on the name alone, passed clean, and would have let the identical
 * mistake through a second time.
 *
 * So the content decides when the name does not. three's chunk names carry
 * their own stage — `<normal_fragment_maps>` is a fragment chunk, `<begin_vertex>`
 * is a vertex one — and an injection has to name the chunk it replaces, which
 * makes this a property of the literal rather than a guess about it.
 */
function stageOf(exportName, body) {
  if (exportName && /(^|_)FRAGMENT(_|$)/.test(exportName)) return "fragment";
  if (exportName && /(^|_)VERTEX(_|$)/.test(exportName)) return "vertex";

  const includes = [...body.matchAll(/#include\s*<([^>]+)>/g)].map((m) => m[1]);
  if (includes.some((name) => name.includes("fragment")) || /\bgl_Frag\w+/.test(body)) {
    return "fragment";
  }
  if (includes.some((name) => name.includes("vertex")) || /\bgl_Position\b/.test(body)) {
    return "vertex";
  }
  return null;
}

/**
 * Is this name declared inside the literal itself?
 *
 * Covers the two ways it can be: a stage declaration (`uniform mat3 x;`) and an
 * ordinary local (`vec2 uv = …;`). The local case is not a technicality — the
 * plate's reflection shader legitimately declares a `vec2 uv` of its own, and a
 * guard that flagged it would be a guard somebody switches off.
 */
function declaredIn(code, name) {
  const qualified = new RegExp(`\\b(?:uniform|varying|attribute|in|out)\\s+\\w+\\s+${name}\\b`);
  const local = new RegExp(`\\b(?:lowp\\s+|mediump\\s+|highp\\s+)?\\w+\\s+${name}\\s*(?:=|;|\\[)`);
  return qualified.test(code) || local.test(code);
}

/* ── The literals ──────────────────────────────────────────────────────────*/

for (const file of (await readdir(DIR)).sort()) {
  if (!file.endsWith(".ts")) continue;
  const rel = path.join("src/webgl/glsl", file);
  const source = await readFile(path.join(DIR, file), "utf8");

  const fragments = [];

  for (const match of source.matchAll(LITERAL)) {
    const [, exportName, body] = match;
    const lineOf = (offset) => source.slice(0, match.index).split("\n").length + offset;

    /* Guard 1 — a backtick ended the literal early. */
    if (body.includes("`")) {
      fail(
        `${rel}:${lineOf(body.split("`")[0].split("\n").length - 1)}`,
        "    backtick inside a GLSL template literal — quote identifiers with\n" +
          '    "double quotes" or leave them bare in shader comments.',
      );
      continue;
    }

    if (stageOf(exportName, body) !== "fragment") continue;

    /* Comments are prose in this codebase and name these identifiers freely —
       the block above this one in pxlGrain explains normalMatrix at length. */
    fragments.push({
      exportName: exportName ?? "(anonymous literal)",
      code: body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""),
    });
  }

  /**
   * Guard 2, over the FILE's fragment literals rather than each one alone.
   *
   * A module's injections are separate exports and one shader: `pxlGrain`
   * declares the uniform in `PXL_GRAIN_FRAGMENT_COMMON` and uses it in
   * `PXL_GRAIN_NORMAL`, and both are spliced into the same program. Checking a
   * literal against only its own text reports that as an error, which is a false
   * positive on the very fix this guard is meant to encourage.
   *
   * Pairing declarations by file is coarser than following the splice, and it is
   * the right amount of coarse: a shader in this project is assembled from one
   * module, and the alternative is reading the injection sites in PxlVessel.
   */
  const declaredSomewhere = (name) => fragments.some(({ code }) => declaredIn(code, name));

  for (const { exportName, code } of fragments) {
    for (const name of vertexOnly) {
      if (!new RegExp(`(?<![\\w.])${name}\\b`).test(code)) continue;
      if (declaredSomewhere(name)) continue;
      fail(
        `${rel} — ${exportName}`,
        `    "${name}" is declared by three in its VERTEX prefix only, so a\n` +
          "    fragment shader using it fails to link with \"undeclared\n" +
          "    identifier\" — at runtime, on the first draw, where nothing in\n" +
          "    the build will tell you. Declare it in this module's fragment\n" +
          "    common block (the renderer uploads the common matrices to\n" +
          "    whichever stage declares them) or carry it across as a varying.",
      );
    }
  }
}

if (failures) {
  console.error(`\n  ${failures} GLSL problem(s).\n`);
  process.exitCode = 1;
} else {
  console.log(
    `  GLSL literals clean; ${vertexOnly.length} vertex-only three built-in(s) guarded.`,
  );
}
