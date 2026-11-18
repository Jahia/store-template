# Changelog

## 5.1.0 (unreleased)

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
