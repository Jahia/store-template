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
 * Brand glyphs for the social links (Simple Icons paths, 24×24, drawn in currentColor).
 * Decorative — each link carries the platform name as its aria-label.
 */
const SOCIAL_ICONS: Record<string, string> = {
  Facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  LinkedIn:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  Twitter:
    "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z",
  YouTube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

/** A social brand icon by platform name; null for an unknown platform. */
function SocialIcon({ name }: { name: string }): JSX.Element | null {
  const path = SOCIAL_ICONS[name];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="currentColor">
      <path d={path} />
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
            <a
              key={s.label}
              className={styles.socialLink}
              href={s.href}
              aria-label={s.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <SocialIcon name={s.label} />
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
