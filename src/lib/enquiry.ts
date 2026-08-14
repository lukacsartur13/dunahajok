/**
 * ENQUIRIES — the payload, and the missing destination. Again.
 *
 * §B17 asks for a premium contact experience and says to reuse the existing
 * form backend "if it works". There is no form backend. The site has no server
 * runtime of its own — it is exported statically — no CRM, no form endpoint and
 * no approved destination for a lead. That was already true of the PXL request
 * flow, and `pxlRequest.ts` settled it: treat the PAYLOAD and the TRANSPORT as
 * two problems, solve the payload, and record the missing transport in a shape
 * the UI has to handle.
 *
 * This is the same architecture for the site's own enquiries, and it is
 * deliberately a separate module rather than a generalisation of that one. A
 * configured-boat request and a private-viewing request are different objects
 * with different fields, different recipients and — eventually — different
 * destinations; merging them into one "lead" type would mean a shape that is
 * half-empty whichever kind arrives.
 *
 * WHAT HAPPENS TODAY. `ENQUIRY_DESTINATION.kind === "none"`, so nothing is
 * transmitted by this site. The form composes a message, shows the visitor
 * exactly what it says, and hands it to their own mail client addressed to the
 * yard's published address. Nothing is stored, nothing is claimed, and the
 * visitor can see whether they pressed send.
 *
 * NO FAKE SUCCESS. The alternative that keeps getting built on projects like
 * this one — resolve, log to the console, print "thank you, we'll be in touch"
 * — is not a placeholder. It is a promise nobody has made and nobody can keep,
 * and the person who finds out is the customer, three weeks later.
 */

export type EnquiryIntent = "general" | "viewing" | "service";

export type EnquiryDestination =
  | { kind: "none"; reason: string }
  | { kind: "endpoint"; url: string; approvedBy: string };

/**
 * Changing this to an `endpoint` is the entire work of connecting the forms.
 * `composeEnquiry` already builds the payload and the UI already renders the
 * branch where there is nowhere to send it.
 */
export const ENQUIRY_DESTINATION: EnquiryDestination = {
  kind: "none",
  reason:
    "the site is a static export with no server runtime, and no form endpoint, " +
    "CRM or approved recipient has been supplied for web enquiries",
};

/** Where each intent is addressed, from the yard's own published addresses. */
export interface EnquiryRecipients {
  general: string;
  viewing: string;
  service: string;
}

export interface EnquiryInput {
  intent: EnquiryIntent;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  /** Private viewing only: which boat, by its published name. */
  boat?: string;
  /** Private viewing only: a preferred month, as free text. Never a date picker. */
  when?: string;
  /** The route the enquiry was made from. */
  sourcePage: string;
}

export type EnquiryField = "name" | "email";

/**
 * The smallest honest validation: a name, and something shaped like an address.
 *
 * Every additional required field is a decision that the yard would rather lose
 * the enquiry than receive it incomplete, and nobody at the yard has made that
 * decision. The address test is deliberately shallow — a regular expression
 * cannot decide whether an address exists, and the elaborate ones reject valid
 * addresses.
 */
export function validateEnquiry(input: Pick<EnquiryInput, "name" | "email">): EnquiryField[] {
  const invalid: EnquiryField[] = [];
  if (input.name.trim().length < 2) invalid.push("name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) invalid.push("email");
  return invalid;
}

export interface ComposedEnquiry {
  to: string;
  subject: string;
  body: string;
  mailto: string;
}

const SUBJECTS: Record<EnquiryIntent, string> = {
  general: "Enquiry",
  viewing: "Private viewing request",
  service: "Service enquiry",
};

/**
 * Build the message. Pure, so it can be asserted rather than eyeballed.
 *
 * The body is the visitor's own words plus the facts they supplied, in the
 * order they supplied them, and nothing else. No tracking parameter, no
 * referrer chain, no hidden field — a message somebody is about to send from
 * their own mail account should contain only what they can see.
 */
export function composeEnquiry(
  input: EnquiryInput,
  recipients: EnquiryRecipients,
): ComposedEnquiry {
  const to =
    input.intent === "service"
      ? recipients.service
      : input.intent === "viewing"
        ? recipients.viewing
        : recipients.general;

  const lines = [
    SUBJECTS[input.intent],
    "",
    ...(input.boat ? [`Boat: ${input.boat}`] : []),
    ...(input.when ? [`Preferred timing: ${input.when}`] : []),
    ...(input.boat || input.when ? [""] : []),
    input.name.trim(),
    input.email.trim(),
    ...(input.phone?.trim() ? [input.phone.trim()] : []),
    ...(input.message?.trim() ? ["", input.message.trim()] : []),
  ];

  const subject = input.boat
    ? `${SUBJECTS[input.intent]} — ${input.boat}`
    : SUBJECTS[input.intent];
  const body = lines.join("\n");

  return {
    to,
    subject,
    body,
    mailto: `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}
