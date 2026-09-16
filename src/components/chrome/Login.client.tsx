import { useEffect, useRef, useState } from "react";
import styles from "./login.module.css";

interface LoginLabels {
  signIn: string;
  username: string;
  password: string;
  /** Shown when Jahia rejects the credentials (bad password / unknown user). */
  invalidCredentials: string;
  /** Shown when the account is locked. */
  accountLocked: string;
}

interface LoginProps {
  /** Jahia's /cms/login servlet endpoint (form login). */
  loginUrl: string;
  /** Page to return to after a successful login (the `redirect` param). */
  loginRedirect: string;
  /** Translated labels, computed server-side (engine i18n) and passed in so they
      survive island hydration regardless of which keys SSR happened to collect. */
  labels: LoginLabels;
}

/**
 * Header sign-in island (logged-OUT only — the logged-in account menu is server-rendered
 * chrome in Header). A sign-in button toggles a compact form that posts to Jahia's
 * /cms/login servlet (which authenticates and redirects back to the current page).
 *
 * /cms/login is not CSRF-gated, so a plain form POST works (unlike action `.do` POSTs,
 * which need XHR for the CSRF token).
 *
 * The trigger is a proper disclosure (aria-expanded + aria-controls): opening moves focus
 * to the username field, and Escape closes the panel and returns focus to the trigger.
 */
/**
 * SUPPORT-687 — the storefront is reachable from the public internet through
 * CloudFront, where `/cms/login` is blocked at HAProxy. Every authenticated user of
 * this site holds a `j:privilegedAccess="true"` role (store-developer /
 * store-administrator), there is no self-registration and no site-member role, so
 * signing in only ever makes sense from Jahia's VPN. HAProxy marks CDN-fronted
 * traffic with the `store_public` cookie, and we hide the trigger for those
 * visitors rather than offer a form that 404s on submit.
 *
 * Two choices here are deliberate, and both are load-bearing:
 *
 *  - The decision is made CLIENT-side. `templates/Page/default.server.tsx` is
 *    `cache.perUser`, and that key is `guest` for an anonymous VPN visitor and an
 *    anonymous public visitor alike — so a server-side conditional would be cached
 *    and served to the wrong audience in BOTH directions (a public visitor gets the
 *    button, or worse, a VPN operator loses it). This is the SEC-375 /
 *    GHSA-g6wp-ghxm-mx76 shape. Emitting identical markup for everyone is what
 *    keeps it safe.
 *
 *  - The cookie HIDES rather than shows. With no HAProxy in front — CI, local dev,
 *    the Cypress harness — there is no cookie and the trigger behaves exactly as
 *    before, which is what keeps `16-storefront.cy.ts` green without touching it.
 *
 * This is presentation only. What actually stops a public login is the 404 on
 * `/cms/login` at the edge, never this check.
 */
const PUBLIC_EDGE_COOKIE = "store_public";

export default function Login({ loginUrl, loginRedirect, labels }: Readonly<LoginProps>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Signal hydration: the sign-in trigger is server-rendered, so a click before the
  // onClick is wired wouldn't open the panel. Tests wait for data-login-ready.
  // Visitors arriving through the CDN never become ready, so the trigger stays
  // hidden for them (see PUBLIC_EDGE_COOKIE above).
  useEffect(() => {
    const isPublicEdge = document.cookie
      .split("; ")
      .some((entry) => entry.startsWith(`${PUBLIC_EDGE_COOKIE}=`));
    if (!isPublicEdge) setReady(true);
  }, []);

  // After a failed login, Jahia's /cms/login servlet redirects back here with
  // ?loginError=<reason> (bad_password / unknown_user / account_locked). Surface it as an
  // inline message and reopen the form, then strip the param so a refresh is clean.
  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const reason = params.get("loginError");
    if (!reason) return;
    setError(reason === "account_locked" ? labels.accountLocked : labels.invalidCredentials);
    setOpen(true);
    params.delete("loginError");
    const query = params.toString();
    globalThis.history.replaceState(
      null,
      "",
      globalThis.location.pathname + (query ? `?${query}` : "") + globalThis.location.hash,
    );
  }, [labels.accountLocked, labels.invalidCredentials]);

  // On open, move focus into the panel (username field).
  useEffect(() => {
    if (open) usernameRef.current?.focus();
  }, [open]);

  // Escape closes the disclosure and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    // `hidden` (not a CSS class) so the area is collapsed before hydration too;
    // .login sets only position, so the UA display:none applies cleanly.
    <div className={styles.login} hidden={!ready}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.loginBtn}
        aria-expanded={open}
        aria-controls="login-panel"
        data-login-ready={ready ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {labels.signIn}
      </button>
      {open && (
        <form
          id="login-panel"
          className={styles.panel}
          method="post"
          action={loginUrl}
          aria-label={labels.signIn}
        >
          {/* Where Jahia sends the browser after a successful login. */}
          <input type="hidden" name="redirect" value={loginRedirect} />
          {/* On failure Jahia redirects here with ?loginError=<reason> (surfaced above). */}
          <input type="hidden" name="failureRedirect" value={loginRedirect} />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <label htmlFor="login-username">{labels.username}</label>
          <input ref={usernameRef} id="login-username" name="username" autoComplete="username" required />
          <label htmlFor="login-password">{labels.password}</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <button type="submit" className={styles.submit}>
            {labels.signIn}
          </button>
        </form>
      )}
    </div>
  );
}
