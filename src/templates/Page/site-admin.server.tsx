import { Island, jahiaComponent } from "@jahia/javascript-modules-library";
import { useTranslation } from "react-i18next";
import { Layout } from "~/templates/Layout";
import AdminApp from "~/admin/AdminApp.client";

/**
 * In-site Store Administration page template.
 *
 * Renders the Private App Store admin screens (Forge settings, and — next —
 * Categories and Roles) as React islands directly inside the website, replacing
 * the legacy Spring Web Flow tabs. The server side resolves the site key and
 * enforces the siteAdminForgeSettings permission; the islands call the
 * privateappstore GraphQL extensions as the logged-in user.
 *
 * Assign this template to a page (j:templateName = "site-admin").
 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "site-admin",
    displayName: "Store administration",
    componentType: "template",
  },
  (_props, { renderContext, currentResource }) => {
    const { t } = useTranslation();
    const site = renderContext.getSite();
    const siteKey = site.getSiteKey();
    // Call Java methods directly — GraalVM rejects optional-call (`?.()`) on host objects.
    const language = currentResource ? currentResource.getLocale().getLanguage() : "en";

    let allowed = true;
    try {
      allowed = site.hasPermission("siteAdminForgeSettings");
    } catch (e) {
      // If the permission API shape differs, fall back to the page ACL.
      console.warn("store-template site-admin: permission check failed, relying on page ACL", e);
    }

    if (!allowed) {
      return (
        <Layout title={t("admin.title")}>
          <main>
            <h1>{t("admin.title")}</h1>
            <p>{t("admin.denied")}</p>
          </main>
        </Layout>
      );
    }

    return (
      <Layout title={t("admin.title")}>
        <main>
          <h1>{t("admin.title")}</h1>
          <Island component={AdminApp} props={{ siteKey, language }} />
        </main>
      </Layout>
    );
  },
);
