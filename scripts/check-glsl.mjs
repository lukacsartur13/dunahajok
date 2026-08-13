/**
 * Guard: no backticks inside a GLSL template literal.
 *
 * The shader sources live in tagged template literals, and the convention in
 * this codebase is to document code in prose right next to it. Those two facts
 * collide: a backtick used to quote an identifier — `uLinePixelScale`, the
 * habit of every other comment in the project — silently terminates the
 * template and the rest of the shader is parsed as TypeScript.
 *
 * The compiler does catch it, but as "',' expected" some eighty lines later,
 * which is a genuinely bad five minutes. This says what actually happened.
 *
 *   node scripts/check-glsl.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", "src", "webgl", "glsl");
const LITERAL = /\/\* glsl \*\/ `([\s\S]*?)\n`;/g;

let failures = 0;

for (const file of await readdir(DIR)) {
  if (!file.endsWith(".ts")) continue;
  const source = await readFile(path.join(DIR, file), "utf8");

  for (const match of source.matchAll(LITERAL)) {
    if (!match[1].includes("`")) continue;
    const before = source.slice(0, match.index).split("\n").length;
    const offset = match[1].split("`")[0].split("\n").length - 1;
    console.error(
      `  ${path.join("src/webgl/glsl", file)}:${before + offset}\n` +
        "    backtick inside a GLSL template literal — quote identifiers with\n" +
        '    "double quotes" or leave them bare in shader comments.',
    );
    failures += 1;
  }
}

if (failures) {
  console.error(`\n  ${failures} GLSL literal(s) broken.\n`);
  process.exitCode = 1;
} else {
  console.log("  GLSL literals clean.");
}
