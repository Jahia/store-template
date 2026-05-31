import type { ReactNode } from "react";

/**
 * Minimal HTML document shell for store pages.
 *
 * Phase 0 skeleton: just enough <head>/<body> chrome to prove SSR rendering
 * through the javascript-modules-engine. Navigation, footer, login and the
 * design-system styling arrive in Phase 1 (see docs/JS-MODULE-MIGRATION.md).
 */
export const Layout = ({ title, children }: { title?: string; children: ReactNode }): JSX.Element => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title ?? "Jahia Store"}</title>
    </head>
    <body>{children}</body>
  </html>
);
