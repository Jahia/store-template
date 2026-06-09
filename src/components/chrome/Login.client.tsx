import { useEffect, useRef, useState } from "react";
import styles from "./login.module.css";

interface LoginLabels {
  signIn: string;
  signOut: string;
  username: string;
  password: string;
  /** Shown when Jahia rejects the credentials (bad password / unknown user). */
  invalidCredentials: string;
  /** Shown when the account is locked. */
  accountLocked: string;
}

interface LoginProps {
  isLoggedIn: boolean;
  username: string;
  /** Jahia's /cms/login servlet endpoint (form login). */
  loginUrl: string;
  /** Page to return to after a successful login (the `redirect` param). */
  loginRedirect: string;
  logoutUrl: string;
  /** Translated labels, computed server-side (engine i18n) and passed in so they
      survive island hydration regardless of which keys SSR happened to collect. */
  labels: LoginLabels;
}

/**
 * Header login island. Logged out: a sign-in button toggling a compact form
 * that posts to Jahia's /cms/login servlet (which authenticates and redirects
 * back to the current page). Logged in: the username and a logout link.
 *
 * /cms/login is not CSRF-gated, so a plain form POST works (unlike action `.do`
 * POSTs, which need XHR for the CSRF token).
 *
 * The sign-in trigger is a proper disclosure (aria-expanded + aria-controls, no
 * aria-haspopup="dialog" since the revealed element is an inline form, not a
 * modal): opening moves focus to the username field, and Escape closes the panel
 * and returns focus to the trigger so it stays keyboard-operable.
 */
export default function Login({
  isLoggedIn,
  username,
  loginUrl,
  loginRedirect,
  logoutUrl,
  labels,
}: Readonly<LoginProps>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Signal hydration: the sign-in trigger is server-rendered, so a click before the
  // onClick is wired wouldn't open the panel. Tests wait for data-login-ready.
  useEffect(() => {
    setReady(true);
  }, []);

  // After a failed login, Jahia's /cms/login servlet redirects back here with
  // ?loginError=<reason> (bad_password / unknown_user / account_locked) instead of
  // leaving the user on the bare /cms/login page. Surface it as an inline message and
  // reopen the form, then strip the param so a refresh doesn't re-show the error.
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

  if (isLoggedIn) {
    return (
      <div className={styles.account}>
        <span className={styles.user} title={username}>
          {username}
        </span>
        {/* Real button (not a text link). Jahia's logout servlet accepts a GET,
            so a plain form navigates without needing JS or a CSRF token. */}
        <form className={styles.logoutForm} method="get" action={logoutUrl}>
          <button type="submit" className="store-btn store-btn--ghost store-btn--sm">
            {labels.signOut}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.login}>
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
