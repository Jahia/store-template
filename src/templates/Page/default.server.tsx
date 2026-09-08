import { Area, jahiaComponent } from "@jahia/javascript-modules-library";
import { Layout } from "~/templates/Layout";

/**
 * Default page template for jnt:page.
 *
 * Renders the document shell (via Layout) with a single editable `main` area, so any page
 * on a jahia-store-template site renders through the JS engine. The page-title <h1> is
 * visually hidden: the storefront chrome and the content views carry the visible headings
 * (matching store.jahia.com, which shows no standalone page title), but a single level-1
 * heading must stay in the DOM for assistive tech and the WCAG-AAA gate (axe
 * `page-has-heading-one`). Store administration lives in the Jahia site administration
 * (jContent).
 */
jahiaComponent(
  {
    nodeType: "jnt:page",
    name: "default",
    displayName: "Store page (default)",
    componentType: "template",
    // SECURITY (SEC-375 / GHSA-g6wp-ghxm-mx76): this fragment carries the account
    // widget, reached through Layout -> Header, which renders the viewer's OWN
    // username. Jahia keys a cached fragment on what the viewer may do (an ACL
    // component, which also separates anonymous from authenticated) but never on
    // who they are - so without this line two users holding the same role share
    // the slot and are served each other's name. Any per-user datum rendered into
    // Layout depends on this declaration; see AGENTS.md "Hard engine constraints".
    properties: { "cache.perUser": "true" },
  },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => (
    // Layout supplies the single <main> landmark; this template only fills it.
    <Layout title={title}>
      <h1 className="sr-only">{title ?? currentNode.getName()}</h1>
      <Area name="main" />
    </Layout>
  ),
);
