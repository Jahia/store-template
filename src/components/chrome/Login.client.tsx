import { useState } from "react";
import styles from "./login.module.css";

interface LoginLabels {
  signIn: string;
  signOut: string;
  username: string;
  password: string;
  rememberMe: string;
}

interface LoginProps {
  isLoggedIn: boolean;
  username: string;
  /** Current page URL — Jahia's auth valve logs in on any POST carrying username+password. */
  loginUrl: string;
  logoutUrl: string;
  /** Translated labels, computed server-side (engine i18n) and passed in so they
      survive island hydration regardless of which keys SSR happened to collect. */
  labels: LoginLabels;
}

/**
 * Header login island. Logged out: a sign-in button toggling a compact form
 * that posts to the current page (Jahia authenticates and reloads). Logged in:
 * the username and a logout link.
 */
export default function Login({ isLoggedIn, username, loginUrl, logoutUrl, labels }: Readonly<LoginProps>) {
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <div className={styles.account}>
        <span className={styles.user} title={username}>
          {username}
        </span>
        <a className={styles.logout} href={logoutUrl}>
          {labels.signOut}
        </a>
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
          <label className={styles.remember}>
            <input type="checkbox" name="useCookie" value="on" /> {labels.rememberMe}
          </label>
          <button type="submit" className={styles.submit}>
            {labels.signIn}
          </button>
        </form>
      )}
    </div>
  );
}
