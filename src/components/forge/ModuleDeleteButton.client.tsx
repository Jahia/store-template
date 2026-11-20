import { useEffect, useState } from "react";
import { gqlRequest } from "~/lib/graphql";
import styles from "./publish.module.css";

export interface ModuleDeleteLabels {
  remove: string;
  confirmPrompt: string;
  confirm: string;
  cancel: string;
  deleting: string;
  error: string;
}

interface ModuleDeleteButtonProps {
  /** JCR path of the module node. */
  path: string;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /**
   * Render-servlet URL of the unregisterGitModule action for a git-backed module, or null for
   * a local module, which is deleted as a node.
   */
  unregisterActionUrl: string | null;
  /** Where to go once the module is gone (the My modules page). */
  backUrl: string;
  /** Module title, for the confirm prompt. */
  title: string;
  labels: ModuleDeleteLabels;
}

const deleteModuleMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation DeleteModule($path: String!) {
    jcr(workspace: ${ws}) {
      deleteNode(pathOrId: $path)
    }
  }
`;

/**
 * POST via XMLHttpRequest, so Jahia's CSRF guard attaches the per-page OWASP-CSRFTOKEN header
 * (the guard patches XHR, not fetch nor a plain <form> post), like the other git-module buttons.
 */
function postAction(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
}

/** The action answers `{error}` on a failure and `{module}` on success, both HTTP 200. */
function actionFailed(status: number, body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed !== null && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      if (typeof o.error === "string") return true;
      return !(status >= 200 && status < 300 && typeof o.module === "string");
    }
  } catch {
    // non-JSON body: opaque
  }
  return true;
}

/**
 * Owner control to remove a module from the store, with an inline confirmation (no native
 * confirm()). A local module is deleted as a node through the generic jcr deleteNode mutation
 * (JCR ACLs apply, as for a version). A git-backed module is unregistered through the
 * unregisterGitModule action: the registration goes, the repository is untouched. Either way
 * the page of the module is gone, so the browser moves to the My modules page.
 */
export default function ModuleDeleteButton({
  path,
  workspace,
  unregisterActionUrl,
  backUrl,
  title,
  labels,
}: Readonly<ModuleDeleteButtonProps>) {
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const remove = async () => {
    setStatus("deleting");
    try {
      if (unregisterActionUrl) {
        const res = await postAction(unregisterActionUrl);
        if (actionFailed(res.status, res.body)) throw new Error("unregister failed");
      } else {
        const data = await gqlRequest<{ jcr?: { deleteNode?: boolean } }>(deleteModuleMutation(workspace), { path });
        if (!data?.jcr?.deleteNode) throw new Error("deleteNode returned false");
      }
      globalThis.location.assign(backUrl);
    } catch {
      setStatus("error");
    }
  };

  return (
    <span
      className={styles.wrap}
      data-module-delete={unregisterActionUrl ? "git" : "local"}
      data-module-delete-ready={ready ? "true" : undefined}
    >
      {confirming ? (
        <span className={styles.wrap}>
          <span>
            {labels.confirmPrompt} ({title})
          </span>
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
      ) : (
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
      )}
      {status === "error" && (
        <span className={styles.error} role="alert">
          {labels.error}
        </span>
      )}
    </span>
  );
}
