#!/usr/bin/env node
/**
 * Run the configurator contract tests.
 *
 * WHY THERE IS NO TEST RUNNER. The project has no test framework, and adding
 * one — Vitest, Jest, their transforms, their config — is a dependency tree and
 * a build step in exchange for `describe` and `expect`, neither of which the
 * twelve assertions in `configurator.test.ts` need. What they *do* need is to
 * import TypeScript modules that use extensionless relative imports, which is
 * the one thing node's own type stripping cannot resolve. `tsc --module
 * commonjs` can: CommonJS resolution has always been extensionless, so the
 * modules compile and `require` finds them.
 *
 * The tested modules are pure by design — `pxlPalette`, `pxlModel`,
 * `pxlConfig` and `pxlPresets` import nothing but each other, no three, no
 * gsap, no React — which is what makes this possible at all. Keep it that way:
 * the moment one of them reaches for a renderer, this stops working and the
 * only fix is a real runner.
 *
 * Emitted JS lands in the OS temp directory and is removed afterwards.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = mkdtempSync(join(tmpdir(), "pxl-test-"));

/**
 * A THROWAWAY tsconfig, RATHER THAN A LIST OF FLAGS.
 *
 * `--paths` is one of the few options tsc refuses on the command line, and the
 * tested modules need it: Phase Four's content modules import through the
 * site's own `@/*` alias, and asking `src/content` to be the one directory
 * that may not would be a rule nobody would remember to follow.
 *
 * So the compiler gets a real config file, written into the temp directory and
 * pointed back at the project root. It sets `rootDir` explicitly as well —
 * without it, adding a `baseUrl` changes the inferred common root and the
 * emitted tree lands somewhere the runner then cannot find.
 */
const config = join(out, "tsconfig.test.json");
writeFileSync(
  config,
  JSON.stringify({
    compilerOptions: {
      module: "commonjs",
      moduleResolution: "node",
      target: "ES2022",
      strict: true,
      // The palette and model modules are `readonly` tuples in places; the
      // tests read them, never write them, so this only affects emit.
      skipLibCheck: true,
      types: ["node"],
      baseUrl: root,
      rootDir: root,
      paths: { "@/*": ["src/*"] },
      outDir: out,
      esModuleInterop: true,
    },
    files: [join(root, "scripts/pxl/configurator.test.ts")],
  }),
);

try {
  try {
    execFileSync("npx", ["tsc", "--project", config], { cwd: root, stdio: "pipe" });
  } catch (error) {
    // tsc exits non-zero on any diagnostic, including ones that do not prevent
    // emit (an unrelated .d.ts in node_modules, most often). Report and carry
    // on to the run — a genuine compile failure will surface as a missing file.
    const text = String(error.stdout ?? "") + String(error.stderr ?? "");
    const relevant = text
      .split("\n")
      .filter((line) => line.includes("scripts/") || line.includes("src/"));
    if (relevant.length) {
      console.error("TypeScript errors in the tested modules:\n" + relevant.join("\n"));
      process.exit(1);
    }
  }

  execFileSync(process.execPath, [join(out, "scripts/pxl/configurator.test.js")], {
    cwd: root,
    stdio: "inherit",
  });
} finally {
  rmSync(out, { recursive: true, force: true });
}
