/**
 * The hook itself. Registered by `ts-resolve.mjs`; see the note there.
 *
 * Only a specifier that has ALREADY FAILED is retried, and only with `.ts`.
 * That ordering matters: a hook that appended `.ts` first would shadow a real
 * `.mjs` sibling, and a hook that guessed among several extensions would
 * resolve differently from the bundler on the day both exist.
 */

export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || specifier.endsWith(".ts")) throw error;
    return next(`${specifier}.ts`, context);
  }
}
