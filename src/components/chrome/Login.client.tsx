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
export default function Login({ loginUrl, loginRedirect, labels }: Readonly<LoginProps>) {
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
