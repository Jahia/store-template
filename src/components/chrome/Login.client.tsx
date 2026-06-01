import { useState } from "react";
import styles from "./login.module.css";

interface LoginLabels {
  signIn: string;
  signOut: string;
  username: string;
  password: string;
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
        type="button"
        className={styles.loginBtn}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        {labels.signIn}
      </button>
      {open && (
        <form
          className={styles.panel}
          method="post"
          action={loginUrl}
          aria-label={labels.signIn}
        >
          {/* Where Jahia sends the browser after a successful login. */}
          <input type="hidden" name="redirect" value={loginRedirect} />
          <label htmlFor="login-username">{labels.username}</label>
          <input id="login-username" name="username" autoComplete="username" required />
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
