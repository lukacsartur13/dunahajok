"use client";

/**
 * REQUEST THIS CONFIGURATION — the interface.
 *
 * §33 asks for a focused form rather than a lead-capture interrogation, and
 * §32 forbids faking a submission. Both are visible in what this component
 * does at the end: it builds the payload, shows the customer the configuration
 * that is attached, and then — because `PXL_REQUEST_DESTINATION` is `none` —
 * says so plainly and hands them the message to send from their own mail
 * application. There is no tick, no "we'll be in touch", and no spinner
 * resolving into a promise nobody at the yard has made.
 *
 * WHAT THE CUSTOMER NEVER DOES IS RE-ENTER THEIR CONFIGURATION. §33's last
 * line, and the reason the summary sits above the fields rather than being
 * something to describe in the message box.
 *
 * The dialog is a dialog properly: modal semantics, focus moved in on open and
 * restored on close, Escape closes, and the background is inert to a screen
 * reader while it is up. A configurator that is careful about a radiogroup and
 * careless about a modal has not been careful about anything.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CONTACT } from "@/content/site";
import type { PxlStrings } from "@/content/pxlStrings";
import {
  PXL_REQUEST_DESTINATION,
  buildPxlRequestPayload,
  requestMailtoHref,
  submitPxlRequest,
  validatePxlRequest,
  type PxlRequestContact,
  type PxlRequestPayload,
  type PxlRequestProduct,
  type PxlRequestResult,
} from "@/webgl/scenes/pxl/pxlRequest";
import type { PxlConfiguration, PxlSummaryLine } from "@/webgl/scenes/pxl/pxlConfig";
import styles from "./PxlProductConfigurator.module.css";

interface PxlRequestPanelProps {
  open: boolean;
  onClose: () => void;
  t: PxlStrings;
  product: PxlRequestProduct;
  configuration: PxlConfiguration;
  summary: readonly PxlSummaryLine[];
  /** The permalink for the configuration as it stands. */
  configurationUrl: string;
  sourcePage: string;
  categoryLabel: (id: string) => string;
}

const EMPTY: PxlRequestContact = { name: "", email: "", phone: "", message: "" };

export function PxlRequestPanel({
  open,
  onClose,
  t,
  product,
  configuration,
  summary,
  configurationUrl,
  sourcePage,
  categoryLabel,
}: PxlRequestPanelProps) {
  const [contact, setContact] = useState<PxlRequestContact>(EMPTY);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [result, setResult] = useState<PxlRequestResult | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const ids = useId();

  /* ── Focus, on the way in and on the way out ───────────────────────────── */
  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    // Directly, not on the next animation frame. The panel is absent from the
    // tree when closed rather than hidden with `display: none`, so by the time
    // this effect runs the field exists and is visible — and a rAF here would
    // make the initial focus depend on the frame loop, which a background tab
    // is entitled to stop servicing altogether.
    firstField.current?.focus();
    return () => {
      // Focus goes back where it came from. Losing it to <body> after a modal
      // is the single most common way a keyboard user is stranded.
      returnTo.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      // A minimal focus trap. `inert` on the rest of the page would be
      // cleaner and is not universally available; this is four lines and
      // behaves identically for the case that matters.
      const focusable = dialog.current?.querySelectorAll<HTMLElement>(
        "input, textarea, button, a[href]",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  /* Reopening starts clean. A stale "no destination" panel from five minutes
     ago sitting over a fresh form would be answering a question nobody asked. */
  useEffect(() => {
    if (open) return;
    setResult(null);
    setInvalid([]);
  }, [open]);

  const payload: PxlRequestPayload = useMemo(
    () =>
      buildPxlRequestPayload({
        product,
        configuration,
        contact,
        configurationUrl,
        sourcePage,
        createdAt: new Date().toISOString(),
      }),
    [product, configuration, contact, configurationUrl, sourcePage],
  );

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const problems = validatePxlRequest(contact);
      setInvalid(problems);
      if (problems.length) {
        // Send focus to the first field that needs attention rather than
        // announcing a problem the viewer then has to go looking for.
        dialog.current
          ?.querySelector<HTMLElement>(`[data-field="${problems[0]}"]`)
          ?.focus();
        return;
      }
      setResult(await submitPxlRequest(payload));
    },
    [contact, payload],
  );

  const field = (key: keyof PxlRequestContact) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setContact((c) => ({ ...c, [key]: event.target.value }));

  if (!open) return null;

  const mailto = requestMailtoHref(payload, CONTACT.email);

  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
      >
        <h2 className={styles.panelTitle} id={`${ids}-title`}>
          {t.requestHeading}
        </h2>

        {/* §30/§33: the configuration is shown, attached, and never re-typed. */}
        <dl className={styles.summary}>
          <div className={styles.summaryRow}>
            <dt>{t.modelLabel}</dt>
            <dd>{product.name}</dd>
          </div>
          {summary.map((line) => (
            <div className={styles.summaryRow} key={line.category}>
              <dt>{categoryLabel(line.category)}</dt>
              {/* An unapproved name is printed with its stable token beside it,
                  so what reaches the yard is unambiguous even if the working
                  name changes before anyone reads it. */}
              <dd>
                {line.value ?? line.slug}
                {line.value && !line.approved ? (
                  <span className={styles.token}> · {line.slug}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        {/* §53: the enquiry is where an unapproved name is most likely to be
            read as a commitment, so it is qualified here in a sentence as well
            as marked per-row above. */}
        {summary.some((line) => line.value && !line.approved) ? (
          <p className={styles.qualifier}>{t.provisionalNames}</p>
        ) : null}

        {result ? (
          <RequestOutcome result={result} t={t} mailto={mailto} onClose={onClose} />
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <p className={styles.panelNote}>{t.requestIntro}</p>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.requestName}</span>
              <input
                ref={firstField}
                data-field="name"
                className={styles.input}
                value={contact.name}
                onChange={field("name")}
                autoComplete="name"
                aria-invalid={invalid.includes("name") || undefined}
                aria-describedby={invalid.includes("name") ? `${ids}-name-error` : undefined}
              />
              {invalid.includes("name") ? (
                <span className={styles.error} id={`${ids}-name-error`}>
                  {t.requestInvalidName}
                </span>
              ) : null}
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>{t.requestEmail}</span>
              <input
                data-field="email"
                className={styles.input}
                type="email"
                inputMode="email"
                value={contact.email}
                onChange={field("email")}
                autoComplete="email"
                aria-invalid={invalid.includes("email") || undefined}
                aria-describedby={invalid.includes("email") ? `${ids}-email-error` : undefined}
              />
              {invalid.includes("email") ? (
                <span className={styles.error} id={`${ids}-email-error`}>
                  {t.requestInvalidEmail}
                </span>
              ) : null}
            </label>

            {/* Optional, and marked optional rather than merely lacking a
                required attribute — no business rule has been supplied that
                makes a phone number a condition of being answered. */}
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {t.requestPhone} <em>{t.requestOptional}</em>
              </span>
              <input
                className={styles.input}
                type="tel"
                value={contact.phone ?? ""}
                onChange={field("phone")}
                autoComplete="tel"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                {t.requestMessage} <em>{t.requestOptional}</em>
              </span>
              <textarea
                className={styles.textarea}
                rows={3}
                value={contact.message ?? ""}
                onChange={field("message")}
              />
            </label>

            <div className={styles.panelActions}>
              <button type="button" className={styles.ghost} onClick={onClose}>
                {t.requestCancel}
              </button>
              <button type="submit" className={styles.primary}>
                {t.requestSubmit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * What happened, said accurately.
 *
 * Three outcomes and three different sentences. The one that exists today is
 * `no-destination`, and it is not dressed up as either a success or an error:
 * nothing went wrong, and nothing was sent, and both of those are true at once.
 */
function RequestOutcome({
  result,
  t,
  mailto,
  onClose,
}: {
  result: PxlRequestResult;
  t: PxlStrings;
  mailto: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.outcome} role="status">
      {result.status === "no-destination" ? (
        <>
          <p className={styles.panelNote}>{t.requestNoDestination}</p>
          <div className={styles.panelActions}>
            <button type="button" className={styles.ghost} onClick={onClose}>
              {t.requestCancel}
            </button>
            {/* The only real action available. It opens the customer's own mail
                client with the configuration in the body; this site transmits
                nothing and claims nothing. */}
            <a className={styles.primary} href={mailto}>
              {t.requestOpenMail}
            </a>
          </div>
          {process.env.NODE_ENV !== "production" ? (
            <p className={styles.devNote}>
              NO APPROVED DESTINATION — {PXL_REQUEST_DESTINATION.kind === "none"
                ? PXL_REQUEST_DESTINATION.reason
                : ""}
            </p>
          ) : null}
        </>
      ) : null}

      {result.status === "sent" ? <p className={styles.panelNote}>{t.requestIntro}</p> : null}

      {result.status === "failed" ? (
        <>
          <p className={styles.panelNote}>{t.requestNoDestination}</p>
          <div className={styles.panelActions}>
            <a className={styles.primary} href={mailto}>
              {t.requestOpenMail}
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
