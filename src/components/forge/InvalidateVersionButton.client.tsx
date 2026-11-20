import { useEffect, useState } from "react";
import { gqlRequest } from "~/lib/graphql";
import styles from "./validation.module.css";

export interface InvalidateLabels {
  invalidate: string;
  reasonPlaceholder: string;
  confirm: string;
  cancel: string;
  invalidating: string;
  error: string;
}

interface InvalidateVersionButtonProps {
  siteKey: string;
  moduleName: string;
  version: string;
  labels: InvalidateLabels;
}

const INVALIDATE = /* GraphQL */ `
  mutation InvalidateVersion($siteKey: String!, $moduleName: String!, $version: String!, $reason: String!) {
    forge {
      invalidateVersion(siteKey: $siteKey, moduleName: $moduleName, version: $version, reason: $reason) {
        status
      }
    }
  }
`;

/**
 * "Invalidate" control of a version on the dashboard, for a store administrator: asks for the
 * reason, then rejects the version whatever its checks say and withdraws it from the public. The
 * page reloads once done.
 */
export default function InvalidateVersionButton({ siteKey, moduleName, version, labels }: Readonly<InvalidateVersionButtonProps>) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "invalidating" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const invalidate = async () => {
    setStatus("invalidating");
    try {
      await gqlRequest(INVALIDATE, { siteKey, moduleName, version, reason });
      globalThis.location.reload();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error && e.message ? e.message : labels.error);
    }
  };

  return (
    <div className={styles.actions} data-invalidate={version} data-invalidate-ready={ready ? "true" : undefined}>
      {open ? (
        <>
          <input
            className={styles.input}
            type="text"
            placeholder={labels.reasonPlaceholder}
            aria-label={labels.reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className="store-btn store-btn--danger store-btn--sm"
            disabled={status === "invalidating" || reason.trim() === ""}
            onClick={invalidate}
          >
            {status === "invalidating" ? labels.invalidating : labels.confirm}
          </button>
          <button type="button" className="store-btn store-btn--ghost store-btn--sm" disabled={status === "invalidating"} onClick={() => setOpen(false)}>
            {labels.cancel}
          </button>
        </>
      ) : (
        <button type="button" className="store-btn store-btn--ghost store-btn--sm" onClick={() => setOpen(true)}>
          {labels.invalidate}
        </button>
      )}
      {status === "error" && (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}
    </div>
  );
}
