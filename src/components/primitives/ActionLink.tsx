"use client";

/**
 * ActionLink — every call to action on the site.
 *
 * Deliberately not a pill. A Duna action is a hairline rule with a label and
 * a raked arrow: it reads as a technical annotation you can press, which is
 * the same language as the rest of the page. Hover draws the rule through
 * from the leading edge; it never scales, glows or bounces.
 *
 * Renders <a> for hrefs and <button> otherwise, so keyboard and screen-reader
 * behaviour is always the native one.
 */

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "./ActionLink.module.css";

type Variant = "primary" | "ghost" | "quiet";

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  /** Trailing glyph. "arrow" for navigation, "none" for toggles. */
  glyph?: "arrow" | "none";
  className?: string;
}

type AnchorProps = BaseProps & { href: string } & Omit<
    ComponentPropsWithoutRef<"a">,
    keyof BaseProps | "href"
  >;
type ButtonProps = BaseProps & { href?: undefined } & Omit<
    ComponentPropsWithoutRef<"button">,
    keyof BaseProps
  >;

export function ActionLink(props: AnchorProps): React.JSX.Element;
export function ActionLink(props: ButtonProps): React.JSX.Element;
export function ActionLink({
  children,
  variant = "ghost",
  glyph = "arrow",
  className,
  ...rest
}: AnchorProps | ButtonProps) {
  const classes = [styles.action, styles[variant], "t-label", className].filter(Boolean).join(" ");

  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      {glyph === "arrow" ? (
        <span className={styles.arrow} aria-hidden="true">
          <svg viewBox="0 0 24 12" fill="none" focusable="false">
            <path d="M0 6h21.5M16.5 1l5.5 5-5.5 5" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </span>
      ) : null}
      <span className={styles.rule} aria-hidden="true" />
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const external = /^https?:\/\//.test(rest.href);
    return (
      <a
        {...(rest as ComponentPropsWithoutRef<"a">)}
        className={classes}
        {...(external ? { target: "_blank", rel: "noreferrer noopener" } : null)}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" {...(rest as ComponentPropsWithoutRef<"button">)} className={classes}>
      {inner}
    </button>
  );
}
