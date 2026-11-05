import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES_DIR = join(__dirname, "..", "settings", "locales");

const locales = readdirSync(LOCALES_DIR)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({
    file,
    messages: JSON.parse(readFileSync(join(LOCALES_DIR, file), "utf8")) as {
      chrome?: { language?: { choose?: string } };
    },
  }));

describe("locales", () => {
  it("ships at least one locale", () => {
    expect(locales.length).toBeGreaterThan(0);
  });

  // The language toggle shows only the current code ("EN"); its aria-label comes from
  // chrome.language.choose. WCAG 2.5.3 (Label in Name, axe label-content-name-mismatch)
  // requires that visible code inside the accessible name, so every translation must keep
  // the {{lang}} placeholder - dropping it silently reintroduces the violation.
  it.each(locales)("$file: chrome.language.choose interpolates the visible language code", ({ messages }) => {
    const label = messages.chrome?.language?.choose;
    expect(label, "chrome.language.choose is missing").toBeTypeOf("string");
    expect(label).toContain("{{lang}}");
  });
});
