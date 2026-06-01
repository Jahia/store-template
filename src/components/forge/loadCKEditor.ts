/**
 * Loads CKEditor 5 from the deployed `richtext-ckeditor5` Jahia module instead of
 * bundling it into store-template. That module ships a webpack Module Federation
 * remote whose `.` entry is `export * from "ckeditor5"`; we bootstrap that
 * container by hand on the live delivery page (where jContent's app-shell, which
 * normally wires up federation, is absent).
 *
 * Why this dance (verified against the deployed remoteEntry.js):
 *  - The remote's last statement is `appShell.remotes.richtextCkeditor5 = <container>`,
 *    so `window.appShell.remotes` MUST exist before the script evaluates or it
 *    throws `ReferenceError: appShell is not defined`. We stub it.
 *  - `container.init({})` is called with an EMPTY share scope: we are not a webpack
 *    host and share nothing, so the remote falls back to its own bundled deps.
 *    `ClassicEditor.create` is framework-agnostic, so no React sharing is needed.
 *  - The jContent coupling (`appShell.remotes.jcontent`) lives ONLY in the remote's
 *    `./init` chunk, never in `.`, so requesting `.` never evaluates it.
 *
 * Everything here is browser-only and lives inside functions, so importing this
 * module from a client island that is also evaluated during SSR is safe.
 */

/** The CKEditor 5 namespace (`export * from "ckeditor5"`): editor class + plugins. */
export interface CKEditorNamespace {
  ClassicEditor: CKEditorClass;
  /** Plugin classes (Bold, Italic, Heading, …) are keyed by name. */
  [name: string]: unknown;
}

interface CKEditorClass {
  create(element: HTMLElement, config: Record<string, unknown>): Promise<CKEditorInstance>;
}

/** The subset of the editor instance API this module uses. */
export interface CKEditorInstance {
  getData(): string;
  setData(data: string): void;
  destroy(): Promise<unknown>;
  model: { document: { on(event: string, callback: () => void): void } };
}

interface FederationContainer {
  init(shareScope: Record<string, unknown>): Promise<void> | void;
  get(module: string): Promise<() => CKEditorNamespace>;
}

const REMOTE_URL = "/modules/richtext-ckeditor5/javascript/apps/remoteEntry.js";
/** Federation container global name (assigned to appShell.remotes.<key>). */
const CONTAINER_KEY = "richtextCkeditor5";
const SCRIPT_MARKER = "data-ckeditor5-remote";

/** Resolved at most once per page; nulled again only if the load fails (so a later mount can retry). */
let cached: Promise<CKEditorNamespace> | null = null;

/** Inject the federation remote <script> once and resolve when it has loaded. */
function injectRemoteScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_MARKER}]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("CKEditor remote failed to load")));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = REMOTE_URL;
    script.async = true;
    script.setAttribute(SCRIPT_MARKER, "");
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("CKEditor remote failed to load")));
    document.head.append(script);
  });
}

/**
 * Resolve the CKEditor 5 namespace (ClassicEditor + plugins) from the
 * richtext-ckeditor5 module's federated remote. Cached across all editor fields
 * on the page.
 */
export function loadCKEditor(): Promise<CKEditorNamespace> {
  if (cached) return cached;
  const pending = (async (): Promise<CKEditorNamespace> => {
    // The remote assigns itself into appShell.remotes.<key>; stub the object graph
    // so the assignment does not throw on the live delivery page.
    const globals = window as unknown as {
      appShell?: { remotes?: Record<string, FederationContainer> };
    };
    globals.appShell ??= {};
    globals.appShell.remotes ??= {};

    await injectRemoteScript();

    const container = globals.appShell.remotes[CONTAINER_KEY];
    if (!container) throw new Error("CKEditor remote container not found after load");

    // Empty share scope → the remote uses its own bundled dependencies.
    await container.init({});
    const factory = await container.get(".");
    const namespace = factory();
    if (!namespace?.ClassicEditor) {
      throw new Error("CKEditor remote did not expose ClassicEditor");
    }
    return namespace;
  })();
  // Drop the cache on failure so a later mount can retry the load.
  pending.catch(() => {
    cached = null;
  });
  cached = pending;
  return pending;
}
