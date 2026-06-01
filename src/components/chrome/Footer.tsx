import { useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import styles from "./Footer.module.css";

// Defaults (Jahia's own) used when a site has not configured the footer in
// Store administration → Settings. A configured value always overrides these.
const DEFAULTS = {
  privacy: "https://www.jahia.com/legal/privacy-policy.html",
  terms: "https://www.jahia.com/terms-of-use-jahia",
  cookies: "https://www.jahia.com/legal/cookies-policy.html",
  facebook: "https://www.facebook.com/JahiaSolutions",
  linkedin: "https://www.linkedin.com/company/jahia-solutions",
  twitter: "https://twitter.com/Jahia",
  youtube: "http://www.youtube.com/jahiacms",
};

/** Read a string property off the site node, tolerating any access failure. */
function prop(site: JCRNodeWrapper, name: string): string {
  try {
    return site.hasProperty(name) ? site.getProperty(name).getString() : "";
  } catch {
    return "";
  }
}

/**
 * Store footer: copyright + legal and social links. Content is read from the
 * site's forge settings (Store administration → Settings); each value falls back
 * to the Jahia default when the site has not configured it.
 */
export function Footer(): JSX.Element {
  const { t } = useTranslation();
  const { renderContext } = useServerContext();
  const site = renderContext.getSite();

  const copyright = prop(site, "forgeSettingsCopyright") || t("footer.copyright");
  const legal = [
    { href: prop(site, "forgeSettingsPrivacyUrl") || DEFAULTS.privacy, key: "footer.privacy" },
    { href: prop(site, "forgeSettingsTermsUrl") || DEFAULTS.terms, key: "footer.terms" },
    { href: prop(site, "forgeSettingsCookiesUrl") || DEFAULTS.cookies, key: "footer.cookies" },
  ];
  const social = [
    { href: prop(site, "forgeSettingsFacebookUrl") || DEFAULTS.facebook, label: "Facebook" },
    { href: prop(site, "forgeSettingsLinkedinUrl") || DEFAULTS.linkedin, label: "LinkedIn" },
    { href: prop(site, "forgeSettingsTwitterUrl") || DEFAULTS.twitter, label: "Twitter" },
    { href: prop(site, "forgeSettingsYoutubeUrl") || DEFAULTS.youtube, label: "YouTube" },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>{copyright}</p>
        <nav className={styles.links} aria-label="Legal">
          {legal.map((l) => (
            <a key={l.key} href={l.href}>
              {t(l.key)}
            </a>
          ))}
        </nav>
        <nav className={styles.social} aria-label="Social media">
          {social.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
