import { useState } from "react";
import styles from "./login.module.css";

interface LoginProps {
  isLoggedIn: boolean;
  username: string;
  /** Current page URL — Jahia's auth valve logs in on any POST carrying username+password. */
  loginUrl: string;
  logoutUrl: string;
}

/**
 * Header login island. Logged out: a "Log in" button toggling a compact form
 * that posts to the current page (Jahia authenticates and reloads). Logged in:
 * the username and a logout link.
 */
export default function Login({ isLoggedIn, username, loginUrl, logoutUrl }: LoginProps) {
  const [open, setOpen] = useState(false);

  if (isLoggedIn) {
    return (
      <div className={styles.account}>
        <span className={styles.user} title={username}>
          {username}
        </span>
        <a className={styles.logout} href={logoutUrl}>
          Log out
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
        Log in
      </button>
      {open && (
        <form className={styles.panel} method="post" action={loginUrl} role="dialog" aria-label="Log in">
          <label htmlFor="login-username">Username</label>
          <input id="login-username" name="username" autoComplete="username" required />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <label className={styles.remember}>
            <input type="checkbox" name="useCookie" value="on" /> Remember me
          </label>
          <button type="submit" className={styles.submit}>
            Log in
          </button>
        </form>
      )}
    </div>
  );
}
