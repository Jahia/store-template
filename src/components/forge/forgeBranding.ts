import { server } from "@jahia/javascript-modules-library";

/**
 * jahia-store moved forge settings off the JCR site node (the cross-module
 * `jmix:forgeSettings` mixin) into per-site OSGi configuration. The public storefront
 * chrome still needs the PUBLIC branding (logo, copyright, footer links) during anonymous
 * SSR, so it reads them here by calling jahia-store's `ForgeSettingsService` OSGi service
 * in-process — no GraphQL round-trip, no permission gate. The service also holds the Nexus
 * credentials; this bridge deliberately reads ONLY the public branding getters and never
 * exposes the password.
 */
const SERVICE = "org.jahia.modules.forge.settings.ForgeSettingsService";

export interface ForgeBranding {
  logoPath: string;
  copyright: string;
  privacyUrl: string;
  termsUrl: string;
  cookiesUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
}

const EMPTY: ForgeBranding = {
  logoPath: "",
  copyright: "",
  privacyUrl: "",
  termsUrl: "",
  cookiesUrl: "",
  facebookUrl: "",
  linkedinUrl: "",
  twitterUrl: "",
  youtubeUrl: "",
};

// The OSGi service getters return Java String (-> JS string) or null; normalise null/undefined to "".
const str = (v: string | null | undefined): string => v ?? "";

/**
 * The site's configured root-category UUID (stored in the same per-site config), or "".
 * Used by the storefront to enumerate the category facet options for server-side filtering.
 */
export function forgeRootCategoryUuid(siteKey: string): string {
  try {
    const service = server.osgi.getService(SERVICE);
    if (!service) return "";
    const s = service.get(siteKey);
    return s ? str(s.getRootCategoryUuid()) : "";
  } catch {
    return "";
  }
}

/** Public forge branding for a site, or all-empty when unset / the service is unavailable. */
export function forgeBranding(siteKey: string): ForgeBranding {
  try {
    const service = server.osgi.getService(SERVICE);
    if (!service) return EMPTY;
    const s = service.get(siteKey);
    if (!s) return EMPTY;
    return {
      logoPath: str(s.getLogoPath()),
      copyright: str(s.getCopyright()),
      privacyUrl: str(s.getPrivacyUrl()),
      termsUrl: str(s.getTermsUrl()),
      cookiesUrl: str(s.getCookiesUrl()),
      facebookUrl: str(s.getFacebookUrl()),
      linkedinUrl: str(s.getLinkedinUrl()),
      twitterUrl: str(s.getTwitterUrl()),
      youtubeUrl: str(s.getYoutubeUrl()),
    };
  } catch {
    return EMPTY;
  }
}
