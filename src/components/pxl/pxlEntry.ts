"use client";

/**
 * The handover between the editorial page and product mode.
 *
 * §5 asks for a deliberate transition rather than a route flash, and the
 * awkward part is not the animation — it is that the two ends of it are two
 * different React trees. The editorial page can fade itself out; it cannot
 * hold a curtain up while the next route mounts, because by then it no longer
 * exists.
 *
 * So the curtain is drawn twice, by two components, and this module is the one
 * bit of state that has to cross between them: a flag saying "the page you are
 * about to mount was arrived at on purpose, start covered". Written just before
 * the navigation, read and cleared on the first paint of the destination.
 *
 * SESSION STORAGE, NOT A QUERY PARAMETER. The URL on this route is a *shared
 * configuration* — §27 — and a link someone forwards must not carry a
 * transition flag that makes the recipient's first paint a black rectangle
 * fading out for no reason. Session storage is scoped to the tab, dies with it,
 * and is invisible to a copy-paste. §43's "session preference is sufficient",
 * applied to the transition as well as to the hint.
 */

const KEY = "duna:pxl-entry";

/** Called immediately before navigating into product mode. */
export function markPxlEntry(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Private modes and blocked storage. The transition degrades to a plain
    // navigation, which is a perfectly good navigation.
  }
}

/** True once, on the first mount after `markPxlEntry`. Clears itself. */
export function consumePxlEntry(): boolean {
  try {
    if (sessionStorage.getItem(KEY) !== "1") return false;
    sessionStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/* ── The first-use hint ────────────────────────────────────────────────────*/

const HINT_KEY = "duna:pxl-hint-seen";

/**
 * §43: show "drag to explore" once, and never again in this session.
 *
 * Session rather than local storage, and that is a deliberate reading of "do
 * not store invasive tracking". A hint is worth showing to someone who has come
 * back a week later and forgotten; it is not worth a persistent key on their
 * machine to find out whether they have.
 */
export function pxlHintSeen(): boolean {
  try {
    return sessionStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPxlHintSeen(): void {
  try {
    sessionStorage.setItem(HINT_KEY, "1");
  } catch {
    /* see above */
  }
}
