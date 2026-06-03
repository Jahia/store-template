import { buildNodeUrl, useServerContext } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { useTranslation } from "react-i18next";
import { forgeBranding } from "~/components/forge/forgeBranding";
import styles from "./Footer.module.css";

/** Relative path (under the site) of the content folder the modules feed is bound to. */
const MODULES_REPOSITORY = "contents/modules-repository";

// Defaults (Jahia's own) used when a site has not configured the footer in
// Store administration → Settings. A configured value always overrides these.
const DEFAULTS = {
  privacy: "https://www.jahia.com/legal/privacy-policy.html",
  terms: "https://www.jahia.com/terms-of-use-jahia",
  cookies: "https://www.jahia.com/legal/cookies-policy.html",
  facebook: "https://www.facebook.com/JahiaSolutions",
  linkedin: "https://www.linkedin.com/company/jahia-solutions",
  twitter: "https://twitter.com/Jahia",
  youtube: "https://www.youtube.com/jahiacms",
};

/**
 * Footer hrefs come from site-admin-configured settings (Store administration →
 * Settings). A configured value is honoured whenever it is safe to render as a link;
 * only an empty value or a script-bearing scheme (javascript:/data:/vbscript:/file:)
 * falls back to the Jahia default, so the footer can never become an XSS vector
 * (SECURITY-571). A scheme-less value (e.g. "acme.com/privacy" — the common case when an
 * admin omits "https://") is treated as an external https URL rather than silently dropped.
 */
function safeHref(url: string | null | undefined, fallback: string): string {
  const value = (url ?? "").trim();
  if (!value) return fallback;
  // Browsers strip whitespace (tab/newline/CR) from a URL before resolving its scheme, so
  // probe a whitespace-collapsed copy against the deny-list — defeats "java\tscript:" tricks.
  const probe = value.replaceAll(/\s+/g, "").toLowerCase();
  if (/^(?:javascript|data|vbscript|file):/.test(probe)) return fallback;
  if (/^https?:\/\//i.test(value)) return value; // already an absolute http(s) URL
  if (value.startsWith("//")) return `https:${value}`; // protocol-relative → https
  if (value.startsWith("/")) return value; // same-origin path
  return `https://${value}`; // bare host/path → external https
}

/**
 * Public LIVE URL of the modules RSS feed, or null when the site has no modules
 * repository. Links to the clean `/feed` alias rather than the internal
 * `…/contents/modules-repository.moduleList.rss`: the SEO rewrite (privateappstore
 * `seo-urlrewrite-store.xml`) maps `<site live URL>/feed` (and `/feed.xml`) onto that
 * render URL. We take the modules-repository's live URL, strip its `/contents/…` node
 * path to get the site's live render base, and append `/feed` — so Jahia's server-name
 * vanity still resolves it to `<host>/feed` for the visitor. Forced to live mode: the
 * feed lists published versions and is served from the live workspace.
 */
function feedUrl(site: JCRNodeWrapper): string | null {
  try {
    if (!site.hasNode(MODULES_REPOSITORY)) return null;
    const repo = site.getNode(MODULES_REPOSITORY) as unknown as JCRNodeWrapper;
    const siteBase = buildNodeUrl(repo, { mode: "live" }).replace(/\/contents\/.*$/, "");
    return `${siteBase}/feed`;
  } catch {
    return null;
  }
}

/** Standard RSS glyph (dot + two broadcast arcs). Decorative; the link carries the name. */
function RssIcon(): JSX.Element {
  return (
    <svg className={styles.rssIcon} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="6.18" cy="17.82" r="2.18" fill="currentColor" />
      <path
        fill="currentColor"
        d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zM4 10.1v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"
      />
    </svg>
  );
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

  const branding = forgeBranding(site.getSiteKey());
  const copyright = branding.copyright || t("footer.copyright");
  const rssUrl = feedUrl(site);
  const legal = [
    { href: safeHref(branding.privacyUrl, DEFAULTS.privacy), key: "footer.privacy" },
    { href: safeHref(branding.termsUrl, DEFAULTS.terms), key: "footer.terms" },
    { href: safeHref(branding.cookiesUrl, DEFAULTS.cookies), key: "footer.cookies" },
  ];
  const social = [
    { href: safeHref(branding.facebookUrl, DEFAULTS.facebook), label: "Facebook" },
    { href: safeHref(branding.linkedinUrl, DEFAULTS.linkedin), label: "LinkedIn" },
    { href: safeHref(branding.twitterUrl, DEFAULTS.twitter), label: "Twitter" },
    { href: safeHref(branding.youtubeUrl, DEFAULTS.youtube), label: "YouTube" },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.copy}>{copyright}</p>
        <nav className={styles.links} aria-label={t("footer.legalNav")}>
          {legal.map((l) => (
            <a key={l.key} href={l.href}>
              {t(l.key)}
            </a>
          ))}
        </nav>
        <nav className={styles.social} aria-label={t("footer.socialNav")}>
          {social.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
        {rssUrl && (
          <a
            className={styles.feed}
            href={rssUrl}
            aria-label={t("footer.rss")}
            title={t("footer.rss")}
            data-rss-feed=""
          >
            <RssIcon />
            <span className={styles.feedLabel}>RSS</span>
          </a>
        )}
      </div>
    </footer>
  );
}
