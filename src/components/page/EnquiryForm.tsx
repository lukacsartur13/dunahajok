"use client";

/**
 * THE ENQUIRY FORM — §B17, §B18.
 *
 * §B17 asks not to force everyone through one giant generic form, so there is
 * one COMPONENT and three FORMS: the intent decides which fields exist, and the
 * private-viewing intent gains the two the others do not need. A single form
 * with conditional fieldsets is the same thing built worse — every visitor
 * scrolls past the questions that are not theirs.
 *
 * §B18's flow — SELECT BOAT · YOUR DETAILS · MESSAGE · REQUEST — is the field
 * order of the viewing form, in that order, with the boat first because it is
 * the question that changes the conversation. It is not a four-step wizard: a
 * wizard for four fields is three extra clicks and a lost enquiry on every
 * back button.
 *
 * ── WHAT HAPPENS WHEN YOU PRESS THE BUTTON ─────────────────────────────────
 *
 * Nothing is sent by this page. There is no endpoint — see `lib/enquiry.ts` —
 * so the form composes the message, SHOWS IT, and hands it to the visitor's own
 * mail client addressed to the yard. The message is displayed rather than
 * hidden because a form that opens a mail window with text the visitor has not
 * read is a form that sends things in their name.
 *
 * The button says "Open in mail" once the form is valid, which is what it does.
 * It never says "Send", because this page cannot.
 *
 * ── ACCESSIBILITY ──────────────────────────────────────────────────────────
 *
 * A real `<form>` with real `<label>`s, native validation attributes, errors
 * bound with `aria-describedby` and `aria-invalid`, and a live region for the
 * result. Submitting with the keyboard works because it is a submit button in a
 * form and nothing intercepts it.
 */

import { useCallback, useId, useMemo, useState, type FormEvent } from "react";
import { CONTACT } from "@/content/site";
import {
  ENQUIRY_DESTINATION,
  composeEnquiry,
  validateEnquiry,
  type EnquiryField,
  type EnquiryIntent,
} from "@/lib/enquiry";
import styles from "./EnquiryForm.module.css";

const RECIPIENTS = {
  general: CONTACT.email,
  viewing: CONTACT.email,
  service: CONTACT.suzuki.email,
};

interface EnquiryFormProps {
  intent: EnquiryIntent;
  /** Boats the visitor may ask to see. Published products only. */
  boats?: readonly { id: string; name: string }[];
  sourcePage: string;
  /** The submit control's label before the form has been completed. */
  submitLabel?: string;
}

export function EnquiryForm({
  intent,
  boats,
  sourcePage,
  submitLabel = "Prepare request",
}: EnquiryFormProps) {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [boat, setBoat] = useState(boats?.[0]?.name ?? "");
  const [when, setWhen] = useState("");
  const [invalid, setInvalid] = useState<EnquiryField[]>([]);
  const [composed, setComposed] = useState<ReturnType<typeof composeEnquiry> | null>(null);

  const showBoat = intent === "viewing" && Boolean(boats?.length);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const problems = validateEnquiry({ name, email });
      setInvalid(problems);
      if (problems.length) {
        // Focus the first field that needs attention. A form that reports an
        // error and leaves the cursor at the bottom of the page is a form the
        // visitor has to hunt through.
        document.getElementById(`${id}-${problems[0]}`)?.focus();
        setComposed(null);
        return;
      }
      setComposed(
        composeEnquiry(
          {
            intent,
            name,
            email,
            phone,
            message,
            sourcePage,
            ...(showBoat ? { boat } : {}),
            ...(when ? { when } : {}),
          },
          RECIPIENTS,
        ),
      );
    },
    [boat, email, id, intent, message, name, phone, showBoat, sourcePage, when],
  );

  const fields = useMemo(
    () => [
      { key: "name" as const, label: "Name", value: name, set: setName, type: "text", required: true, autoComplete: "name" },
      { key: "email" as const, label: "Email", value: email, set: setEmail, type: "email", required: true, autoComplete: "email" },
      { key: "phone" as const, label: "Telephone", value: phone, set: setPhone, type: "tel", required: false, autoComplete: "tel" },
    ],
    [email, name, phone],
  );

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {showBoat ? (
        <div className={styles.field}>
          <label className={`${styles.label} t-label`} htmlFor={`${id}-boat`}>
            Which boat
          </label>
          <select
            id={`${id}-boat`}
            className={styles.input}
            value={boat}
            onChange={(event) => setBoat(event.target.value)}
          >
            {boats?.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
            <option value="Either — undecided">Either — undecided</option>
          </select>
        </div>
      ) : null}

      {fields.map((field) => {
        const bad = invalid.includes(field.key as EnquiryField);
        return (
          <div className={styles.field} key={field.key}>
            <label className={`${styles.label} t-label`} htmlFor={`${id}-${field.key}`}>
              {field.label}
              {!field.required ? (
                <span className={styles.optional}> · optional</span>
              ) : null}
            </label>
            <input
              id={`${id}-${field.key}`}
              className={styles.input}
              type={field.type}
              value={field.value}
              autoComplete={field.autoComplete}
              onChange={(event) => field.set(event.target.value)}
              aria-invalid={bad || undefined}
              aria-describedby={bad ? `${id}-${field.key}-error` : undefined}
            />
            {bad ? (
              <p className={styles.error} id={`${id}-${field.key}-error`}>
                {field.key === "name"
                  ? "Please enter your name."
                  : "Please enter a valid email address."}
              </p>
            ) : null}
          </div>
        );
      })}

      {intent === "viewing" ? (
        <div className={styles.field}>
          <label className={`${styles.label} t-label`} htmlFor={`${id}-when`}>
            When suits you
            <span className={styles.optional}> · optional</span>
          </label>
          {/* Free text, not a date picker. The yard builds to order and a
              viewing is arranged by conversation; offering a calendar would
              imply availability nobody has published. */}
          <input
            id={`${id}-when`}
            className={styles.input}
            type="text"
            value={when}
            placeholder="A month, or a rough window"
            onChange={(event) => setWhen(event.target.value)}
          />
        </div>
      ) : null}

      <div className={styles.field}>
        <label className={`${styles.label} t-label`} htmlFor={`${id}-message`}>
          Message
          <span className={styles.optional}> · optional</span>
        </label>
        <textarea
          id={`${id}-message`}
          className={`${styles.input} ${styles.textarea}`}
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>

      <button type="submit" className={styles.submit}>
        {submitLabel}
      </button>

      {/* THE HONEST ENDING. The composed message, visible, with the way to send
          it. Announced politely rather than assertively — the visitor pressed a
          button and is looking at the result. */}
      <div className={styles.result} role="status" aria-live="polite">
        {composed ? (
          <>
            <p className={styles.resultNote}>
              This site cannot send messages on your behalf. Your request is
              ready below — it opens in your own mail application, addressed to
              the yard. Nothing is sent by this page.
            </p>
            <pre className={styles.preview}>{composed.body}</pre>
            <a className={styles.submit} href={composed.mailto}>
              Open in mail
            </a>
            <p className={`${styles.resultNote} t-label`}>
              Or write directly to{" "}
              <a href={`mailto:${composed.to}`}>{composed.to}</a>
            </p>
          </>
        ) : null}
      </div>

      {/* The reason, for anyone reading the source or the report. Never shown. */}
      {ENQUIRY_DESTINATION.kind === "none" ? (
        <p hidden data-enquiry-destination={ENQUIRY_DESTINATION.reason} />
      ) : null}
    </form>
  );
}
