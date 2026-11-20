import { useEffect, useState } from "react";
import { gqlRequest } from "~/lib/graphql";
import styles from "./validation.module.css";

export interface RequestValidationLabels {
  request: string;
  requesting: string;
  error: string;
}

interface RequestValidationButtonProps {
  siteKey: string;
  moduleName: string;
  version: string;
  labels: RequestValidationLabels;
}

const REQUEST_VALIDATION = /* GraphQL */ `
  mutation RequestValidation($siteKey: String!, $moduleName: String!, $version: String!) {
    forge {
      requestValidation(siteKey: $siteKey, moduleName: $moduleName, version: $version) {
        status
      }
    }
  }
`;

/**
 * "Validate" button of a version, for the owner of the module or a store administrator: the
 * store runs every check again and the page reloads with the new record. Goes through GraphQL,
 * which is not CSRF-gated, like the other owner controls.
 */
export default function RequestValidationButton({ siteKey, moduleName, version, labels }: Readonly<RequestValidationButtonProps>) {
  const [status, setStatus] = useState<"idle" | "requesting" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const request = async () => {
    setStatus("requesting");
    try {
      await gqlRequest(REQUEST_VALIDATION, { siteKey, moduleName, version });
      globalThis.location.reload();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error && e.message ? e.message : labels.error);
    }
  };

  return (
    <span data-request-validation={version} data-request-validation-ready={ready ? "true" : undefined}>
      <button type="button" className="store-btn store-btn--ghost store-btn--sm" disabled={status === "requesting"} onClick={request}>
        {status === "requesting" ? labels.requesting : labels.request}
      </button>
      {status === "error" && (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}
    </span>
  );
}
