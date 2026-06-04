import { useEffect, useState } from "react";
import clsx from "clsx";
import styles from "./publish.module.css";
import { gqlRequest } from "~/lib/graphql";

interface PublishLabels {
  publish: string;
  unpublish: string;
  publishing: string;
  publishedState: string;
  draftState: string;
  error: string;
}

interface PublishToggleProps {
  /** JCR path of the module or version node. */
  path: string;
  /** Current published state (server-rendered). */
  published: boolean;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** "module" | "version" - drives the data attribute and ARIA label only. */
  scope: string;
  labels: PublishLabels;
}

/**
 * Build the setValue mutation for a given workspace. `ws` is a server-computed
 * enum ("EDIT" | "LIVE"), never user input, so interpolating it into the query is
 * safe. It MUST target the workspace the page is rendered in: forge content
 * uploaded on the live site is created directly in LIVE by createEntryFromJar, so
 * a default-workspace (EDIT) write would not find the node.
 */
const setPublishedMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation SetPublished($path: String!, $value: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        mutateProperty(name: "published") {
          setValue(value: $value)
        }
      }
    }
  }
`;

/**
 * Owner control to publish / unpublish a forge module or version. Flips the
 * `published` flag (which gates storefront visibility) via the generic jcr
 * setValue mutation - JCR ACLs apply, owners have jcr:write. Uses gqlRequest
 * (fetch to /modules/graphql, which is NOT CSRF-gated), exactly like the metadata
 * editor; it is not an XHR `.do` action.
 *
 * Note: this is a direct flag toggle and intentionally bypasses the legacy
 * PublishModule action's `isPublishable` completeness gate (which also requires a
 * category there is no UI to assign) - the owner controls publication directly.
 */
export default function PublishToggle({
  path,
  published,
  workspace,
  scope,
  labels,
}: Readonly<PublishToggleProps>) {
  const [pub, setPub] = useState(published);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  // Hydration-ready signal (mirrors ModuleEditor): set after mount so tests can
  // wait until the click handler is attached.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const toggle = async () => {
    const next = !pub;
    setStatus("saving");
    try {
      await gqlRequest(setPublishedMutation(workspace), { path, value: String(next) });
      setPub(next);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  // De-nested for clarity (avoids a nested ternary in the JSX below).
  let buttonLabel = labels.publish;
  if (status === "saving") {
    buttonLabel = labels.publishing;
  } else if (pub) {
    buttonLabel = labels.unpublish;
  }

  return (
    <span
      className={styles.wrap}
      data-publish-scope={scope}
      data-publish-ready={ready ? "true" : undefined}
      data-published={pub ? "true" : "false"}
    >
      <span className={clsx(styles.badge, pub ? styles.live : styles.draft)}>
        {pub ? labels.publishedState : labels.draftState}
      </span>
      <button
        type="button"
        className="store-btn store-btn--ghost"
        disabled={status === "saving"}
        aria-label={`${pub ? labels.unpublish : labels.publish} (${scope})`}
        onClick={toggle}
      >
        {buttonLabel}
      </button>
      {status === "error" && (
        <span className={styles.error} role="alert">
          {labels.error}
        </span>
      )}
    </span>
  );
}
