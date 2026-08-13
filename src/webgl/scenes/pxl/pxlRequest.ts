/**
 * REQUEST THIS CONFIGURATION — the payload, and the missing destination.
 *
 * §31 asks for the complete request architecture. §32 says, just as plainly,
 * that there is no approved sales destination and that this phase must not
 * invent one, must not fake a successful submission, and must not quietly reuse
 * an unrelated endpoint. Both are satisfiable at once, and the way to satisfy
 * them is to treat the *payload* and the *transport* as two separate problems:
 *
 *   • the payload is a solved problem, and it is solved here. It is pure data,
 *     built from state the configurator already holds, with no browser API in
 *     sight, so it can be asserted by `npm test` today and posted to a CRM the
 *     afternoon someone supplies a URL;
 *   • the transport is not a solved problem, and `PXL_REQUEST_DESTINATION`
 *     records that in a form the UI has to handle. It is a discriminated union
 *     whose only inhabitant is `kind: "none"`, which means a component cannot
 *     write "send it" without writing the branch where there is nowhere to send
 *     it — the same trick `PxlSpec` uses to make an unpublished specification
 *     unrenderable.
 *
 * WHAT THE PAYLOAD DOES NOT CONTAIN. No price, no lead time, no availability,
 * no specification, and no colour name that has not been approved: the finish
 * travels as its slug and its internal key, which are facts, and the display
 * name is left for whoever reads the enquiry to resolve against the range they
 * have actually approved. §46 and §47 in one decision.
 */

import {
  serialiseConfiguration,
  summariseConfiguration,
  type PxlConfiguration,
} from "./pxlConfig";

/**
 * THIS MODULE IMPORTS NOTHING BUT ITS SIBLINGS, and that is load-bearing.
 *
 * `pxlPalette`, `pxlModel`, `pxlConfig` and `pxlPresets` are pure so that
 * `npm test` can compile and run them on plain node without a test framework —
 * see `scripts/pxl/test-configurator.mjs`. A request payload is exactly the
 * kind of thing that has to be asserted rather than eyeballed, so this file
 * joins that set. The consequence is that the product record does not come
 * from `@/content/pxl` but is passed in: the caller owns the facts, this file
 * owns the shape.
 */
export interface PxlRequestProduct {
  id: "pxl";
  name: string;
  /** `PXL.published`. Travels in the payload — see the field's note. */
  published: boolean;
}

/* ── Where a request goes ──────────────────────────────────────────────────*/

export type PxlRequestDestination =
  | {
      kind: "none";
      /** Printed on the development bench and in the report. Never to a customer. */
      reason: string;
    }
  | {
      kind: "endpoint";
      /** Absolute URL. POSTed `PxlRequestPayload` as JSON. */
      url: string;
      /** Who approved it, and when. A destination without this is not approved. */
      approvedBy: string;
    };

/**
 * THE DESTINATION IS MISSING, AND THIS IS WHERE THAT FACT LIVES.
 *
 * Changing this constant to an `endpoint` is the entire work of connecting the
 * request flow — `submitPxlRequest` already branches on it, the UI already
 * renders the branch, and the payload already has the shape. Nothing else has
 * to change, which is what §32's "document exactly what needs to be connected"
 * ought to mean in a codebase.
 */
export const PXL_REQUEST_DESTINATION: PxlRequestDestination = {
  kind: "none",
  reason:
    "no approved sales destination has been supplied — Phase 2.5 and 2.6 both " +
    "record this as an outstanding business blocker, and the site has no CRM, " +
    "no form endpoint and no approved contact route for a configured enquiry",
};

/* ── The payload ───────────────────────────────────────────────────────────*/

/** What the person asking supplies. Everything else is derived. */
export interface PxlRequestContact {
  name: string;
  email: string;
  /** Optional: no business rule has been supplied that makes it required. */
  phone?: string;
  message?: string;
}

export interface PxlRequestPayload {
  /** Schema version. A stored lead outlives the code that wrote it. */
  version: 1;
  productId: "pxl";
  productName: string;
  /**
   * The configuration, twice, on purpose.
   *
   * `query` is the canonical serialisation and the thing to store — it is short,
   * it round-trips through `parseConfiguration`, and it is what makes a lead
   * from eighteen months ago re-openable. `selections` is the same information
   * flattened for a human reading an email, and `configurationUrl` is the link
   * that reopens it. Storing all three costs a few dozen bytes and removes the
   * need for anyone downstream to own a parser.
   */
  query: string;
  configurationUrl: string;
  selections: ReadonlyArray<{
    category: string;
    /** Internal finish key. Exact, and never shown to a customer. */
    finishId: string;
    /** URL token. The stable identifier for the choice. */
    slug: string;
    /** The provisional working name, marked as such. Null when none may be used. */
    previewLabel: string | null;
    /** False until the yard approves the range. Reader beware, in a field. */
    labelApproved: boolean;
  }>;
  contact: PxlRequestContact;
  /** ISO 8601. Supplied by the caller so this function stays pure. */
  createdAt: string;
  /** Where the request was made from — the route, not a referrer chain. */
  sourcePage: string;
  /**
   * The publication state of the product at the moment of the request.
   *
   * False today. It is in the payload because a lead that arrives while the
   * product is unpublished is a lead about a boat whose specification does not
   * exist yet, and whoever answers it needs to know that without having to
   * remember what was true in August.
   */
  productPublished: boolean;
}

export interface PxlRequestInput {
  product: PxlRequestProduct;
  configuration: PxlConfiguration;
  contact: PxlRequestContact;
  configurationUrl: string;
  sourcePage: string;
  createdAt: string;
}

export function buildPxlRequestPayload(input: PxlRequestInput): PxlRequestPayload {
  const summary = summariseConfiguration(input.configuration, "preview");
  return {
    version: 1,
    productId: "pxl",
    productName: input.product.name,
    query: serialiseConfiguration(input.configuration),
    configurationUrl: input.configurationUrl,
    selections: summary.map((line) => ({
      category: line.category,
      finishId: line.finishId,
      slug: line.slug,
      previewLabel: line.value,
      labelApproved: line.approved,
    })),
    contact: {
      name: input.contact.name.trim(),
      email: input.contact.email.trim(),
      ...(input.contact.phone?.trim() ? { phone: input.contact.phone.trim() } : {}),
      ...(input.contact.message?.trim() ? { message: input.contact.message.trim() } : {}),
    },
    createdAt: input.createdAt,
    sourcePage: input.sourcePage,
    productPublished: input.product.published,
  };
}

/* ── Validation ────────────────────────────────────────────────────────────*/

export type PxlRequestField = "name" | "email";

/**
 * The smallest honest validation.
 *
 * A name and something shaped like an address, and nothing else. §33 asks for a
 * focused form rather than a lead-capture interrogation, and validation is
 * where that intent is usually lost: every additional required field is a
 * decision that the yard would rather lose the enquiry than receive it
 * incomplete, and nobody at the yard has made that decision.
 *
 * The address test is deliberately shallow. A regular expression cannot decide
 * whether an address exists, and the elaborate ones reject valid addresses —
 * so this only rejects what is obviously not an address at all, and lets the
 * yard's reply be the real test.
 */
export function validatePxlRequest(contact: PxlRequestContact): PxlRequestField[] {
  const invalid: PxlRequestField[] = [];
  if (contact.name.trim().length < 2) invalid.push("name");
  const email = contact.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid.push("email");
  return invalid;
}

/* ── Transport ─────────────────────────────────────────────────────────────*/

export type PxlRequestResult =
  /** There is nowhere approved to send this. The only outcome available today. */
  | { status: "no-destination"; reason: string; payload: PxlRequestPayload }
  | { status: "sent"; payload: PxlRequestPayload }
  | { status: "failed"; error: string; payload: PxlRequestPayload };

/**
 * Send a request, if there is anywhere to send it to.
 *
 * Today there is not, so this performs no network call and returns
 * `no-destination` — which the UI renders as exactly that, not as a tick and a
 * "thank you". §32: no fake success. The alternative that keeps getting built
 * on projects like this one — resolve successfully, log to the console, tell the
 * customer the yard will be in touch — is not a placeholder. It is a promise
 * that nobody has made and nobody can keep, and the person who finds out is the
 * customer, three weeks later.
 */
export async function submitPxlRequest(
  payload: PxlRequestPayload,
  destination: PxlRequestDestination = PXL_REQUEST_DESTINATION,
): Promise<PxlRequestResult> {
  if (destination.kind === "none") {
    return { status: "no-destination", reason: destination.reason, payload };
  }
  try {
    const response = await fetch(destination.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { status: "failed", error: `HTTP ${response.status}`, payload };
    }
    return { status: "sent", payload };
  } catch (error) {
    return { status: "failed", error: String(error), payload };
  }
}

/* ── The interim handoff ───────────────────────────────────────────────────*/

/**
 * The request as a message the person can send themselves.
 *
 * NOT A SUBMISSION, and the UI says so. With no approved destination the only
 * honest way to get a configured enquiry to the yard is to hand the customer a
 * pre-written message addressed to the yard's own published address and let
 * them press send in their own mail client. Nothing is transmitted by this
 * site, nothing is stored, and no confirmation is claimed — the customer can
 * see the message, edit it, and knows perfectly well whether they sent it.
 *
 * It is also the reason the payload above is worth building even with no
 * endpoint: this function is a *renderer* for it, and so is the POST.
 */
export function requestPayloadAsMessage(payload: PxlRequestPayload): {
  subject: string;
  body: string;
} {
  const lines = [
    `${payload.productName} — configuration request`,
    "",
    ...payload.selections.map(
      (s) =>
        `${s.category}: ${s.previewLabel ?? s.slug}` +
        (s.labelApproved ? "" : ` (working name; reference: ${s.slug})`),
    ),
    "",
    payload.configurationUrl,
    "",
    payload.contact.name,
    payload.contact.email,
    ...(payload.contact.phone ? [payload.contact.phone] : []),
    ...(payload.contact.message ? ["", payload.contact.message] : []),
  ];
  return {
    subject: `${payload.productName} — configuration request`,
    body: lines.join("\n"),
  };
}

/** `mailto:` for the message above. The address is the caller's to supply. */
export function requestMailtoHref(payload: PxlRequestPayload, address: string): string {
  const { subject, body } = requestPayloadAsMessage(payload);
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
