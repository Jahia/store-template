import { useTranslation } from "react-i18next";
import styles from "./Footer.module.css";

const LEGAL = [
  { href: "https://www.jahia.com/legal/privacy-policy.html", key: "footer.privacy" },
  { href: "https://www.jahia.com/terms-of-use-jahia", key: "footer.terms" },
  { href: "https://www.jahia.com/legal/cookies-policy.html", key: "footer.cookies" },
];

const SOCIAL = [
  { href: "https://www.facebook.com/JahiaSolutions", label: "Facebook" },
  { href: "https://www.linkedin.com/company/jahia-solutions", label: "LinkedIn" },
  { href: "https://twitter.com/Jahia", label: "Twitter" },
  { href: "http://www.youtube.com/jahiacms", label: "YouTube" },
];

/** Store footer: Jahia copyright + legal and social links (ported from the JSP). */
export function Footer(): JSX.Element {
  const { t } = useTranslation();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>{t("footer.copyright")}</p>
        <nav className={styles.links} aria-label="Legal">
          {LEGAL.map((l) => (
            <a key={l.href} href={l.href}>
              {t(l.key)}
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
