import { useEffect, useState } from "react";
import { gqlRequest } from "~/lib/graphql";
import styles from "./publish.module.css";

export interface VersionDeleteLabels {
  remove: string;
  confirmPrompt: string;
  confirm: string;
  cancel: string;
  deleting: string;
  error: string;
}

interface VersionDeleteButtonProps {
  /** JCR path of the version node to delete. */
  path: string;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** Version label, for the confirm prompt's accessible name. */
  versionNumber: string;
  labels: VersionDeleteLabels;
}

/**
 * Delete the version node in the rendered workspace. `ws` is a server-computed
 * enum ("EDIT" | "LIVE"), never user input, so interpolating it is safe. It MUST
 * target the workspace the page is rendered in - forge content uploaded on the
 * live site is created directly in LIVE, exactly like PublishToggle.
 */
const deleteVersionMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation DeleteVersion($path: String!) {
    jcr(workspace: ${ws}) {
      deleteNode(pathOrId: $path)
    }
  }
`;

/**
 * Owner-only control to permanently remove a module/package version. Deletion is
 * irreversible, so it requires an explicit inline confirmation before deleting
 * (no native confirm() - it isn't test-friendly and breaks the island style).
 * Uses the generic jcr deleteNode mutation via gqlRequest (JCR ACLs apply; owners
 * hold jcr:write) - no custom Java action, mirroring ScreenshotManager's delete.
 * The version list is server-rendered outside this island, so a successful delete
 * reloads the page (like VersionChangelogEditor) rather than mutating sibling DOM.
 */
export default function VersionDeleteButton({
  path,
  workspace,
  versionNumber,
  labels,
}: Readonly<VersionDeleteButtonProps>) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const remove = async () => {
    setStatus("deleting");
    try {
      const data = await gqlRequest<{ jcr?: { deleteNode?: boolean } }>(
        deleteVersionMutation(workspace),
        { path },
      );
      // deleteNode returns false when nothing was removed - surface that rather
      // than reloading into an unchanged page (which would read as a no-op).
      if (!data?.jcr?.deleteNode) {
        throw new Error("deleteNode returned false");
      }
      window.location.reload();
    } catch {
      setStatus("error");
    }
  };

  return (
    <span
      className={styles.wrap}
      data-version-delete-scope="version"
      data-version-delete-ready={ready ? "true" : undefined}
    >
      {!confirming ? (
        <button
          type="button"
          className="store-btn store-btn--ghost store-btn--sm"
          onClick={() => {
            setStatus("idle");
            setConfirming(true);
          }}
        >
          {labels.remove}
        </button>
      ) : (
        <span
          className={styles.wrap}
          role="group"
          aria-label={`${labels.confirmPrompt} (${versionNumber})`}
        >
          <span>{labels.confirmPrompt}</span>
          <button
            type="button"
            className="store-btn store-btn--danger store-btn--sm"
            disabled={status === "deleting"}
            onClick={remove}
          >
            {status === "deleting" ? labels.deleting : labels.confirm}
          </button>
          <button
            type="button"
            className="store-btn store-btn--ghost store-btn--sm"
            disabled={status === "deleting"}
            onClick={() => {
              setConfirming(false);
              setStatus("idle");
            }}
          >
            {labels.cancel}
          </button>
        </span>
      )}
      {status === "error" && (
        <span className={styles.error} role="alert">
          {labels.error}
        </span>
      )}
    </span>
  );
}
