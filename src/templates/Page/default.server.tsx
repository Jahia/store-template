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
  },
  ({ "jcr:title": title }: { "jcr:title"?: string }, { currentNode }) => (
    // Layout supplies the single <main> landmark; this template only fills it.
    <Layout title={title}>
      <h1 className="sr-only">{title ?? currentNode.getName()}</h1>
      <Area name="main" />
    </Layout>
  ),
);
