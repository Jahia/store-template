# Changelog

## 5.2.0 (unreleased)

**Requires `jahia-store` 5.3.0**, which defines the `community-reviewed` status.

### Added

- **Community (reviewed) status.** Module owners can pick *Community (reviewed)* in the module editor, and
  the storefront offers it as a Status filter. Each status now shows a label from the locales (`statuses`)
  instead of its capitalized key.

## 5.1.0 (2026-11-18)

**Requires `jahia-store` 5.2.0**, which defines the version security properties, the security advisories
and the published-only rules this version relies on.

### Added

- **Security fixes on module versions.** Module owners can flag a version as containing security fixes,
  with a severity, references (JSA, CVE or GHSA ids) and a note, from the version editor. The store
  publishes these flags in its security updates feed, which Jahia instances read to warn their
  administrators.
- **Security advisories folder.** New store sites get the `contents/security-advisories` folder, where
  store administrators write the security advisories of the store.

### Fixed

- The version security editor accepts JSA references with a numeric suffix.
- Accessibility: the accessible name of the language toggle contains its visible text (WCAG 2.5.3).

### Security

- **JSTORE-SEC-012: SVG and HTML are never accepted as module media.** An SVG or HTML file stored as a
  module icon or screenshot is served from the store's origin, where it can run script when a visitor
  opens it. The icon and screenshot uploads now refuse such a file before uploading it:
  - The file picker offers only PNG, JPEG, GIF and WebP images.
  - A picked file is refused when its extension (`.svg`, `.svgz`, `.html`, `.htm`, `.xhtml`, `.xht`,
    `.shtml`) or its type names SVG or HTML, or when its first 512 bytes contain `<svg`, `<!doctype html`,
    `<html` or `<script`. Any other file must be a PNG, JPEG, GIF or WebP image by its content.
  - The error message says that SVG and HTML files are not accepted and lists the accepted formats, in
    English and French. The refused file is cleared, and the file input is marked invalid and linked to
    the message for assistive technologies.
  - The storefront never links an SVG or HTML file as a module icon or screenshot, even one stored
    before this version.

  The `jahia-store` module applies the same rule on the server and removes such files, in the edit and
  the live workspace.

  **What to do:** deploy this version with the `jahia-store` version that has the JSTORE-SEC-012 fix.
  Module owners who use an SVG icon or screenshot must upload a PNG, JPEG, GIF or WebP image instead.
- The open Dependabot security alerts of the build and test dependencies are resolved.
