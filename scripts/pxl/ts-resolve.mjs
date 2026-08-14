/**
 * Extensionless relative imports, for node.
 *
 * The PXL modules are written the way the rest of the app is — `import … from
 * "./pxlCatalog"` — because that is what the bundler and the TypeScript
 * compiler both expect. Node's ESM resolver has never accepted it: it wants
 * `./pxlCatalog.ts`, and node's own type stripping does not change that.
 *
 * `configurator.test.ts` sidesteps the problem by compiling to CommonJS, whose
 * resolution has always been extensionless. `validate-vessel.mjs` cannot: it
 * imports three, which is ESM-only in the shape it is used here, so it has to
 * stay on the ESM loader.
 *
 * So this is the smallest thing that closes the gap — a resolve hook that
 * retries a failed relative specifier with `.ts` on the end. Twelve lines, no
 * dependency, and it only ever affects a specifier that has already failed.
 */

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-resolve.hook.mjs", pathToFileURL(import.meta.filename));
