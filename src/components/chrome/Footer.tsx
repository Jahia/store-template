import styles from "./Footer.module.css";

const LEGAL = [
  { href: "https://www.jahia.com/legal/privacy-policy.html", label: "Privacy Policy" },
  { href: "https://www.jahia.com/terms-of-use-jahia", label: "Terms of Use" },
  { href: "https://www.jahia.com/legal/cookies-policy.html", label: "Cookie Policy" },
];

const SOCIAL = [
  { href: "https://www.facebook.com/JahiaSolutions", label: "Facebook" },
  { href: "https://www.linkedin.com/company/jahia-solutions", label: "LinkedIn" },
  { href: "https://twitter.com/Jahia", label: "Twitter" },
  { href: "http://www.youtube.com/jahiacms", label: "YouTube" },
];

/** Store footer: Jahia copyright + legal and social links (ported from the JSP). */
export function Footer(): JSX.Element {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>© 2002–2026 All Rights Reserved by Jahia Solutions Group SA</p>
        <nav className={styles.links} aria-label="Legal">
          {LEGAL.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <nav className={styles.social} aria-label="Social media">
          {SOCIAL.map((s) => (
            <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
