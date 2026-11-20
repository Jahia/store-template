import { useEffect, useState } from "react";
import { gqlRequest } from "~/lib/graphql";
import styles from "./validation.module.css";

export interface CheckAnswerLabels {
  prompt: string;
  copy: string;
  copied: string;
  answerPlaceholder: string;
  record: string;
  recording: string;
  error: string;
}

interface ValidationCheckAnswerProps {
  siteKey: string;
  moduleName: string;
  version: string;
  checkKey: string;
  /** The prompt the administrator gives to the assistant that runs the check. */
  prompt: string;
  labels: CheckAnswerLabels;
}

const ANSWER_CHECK = /* GraphQL */ `
  mutation AnswerValidationCheck($siteKey: String!, $moduleName: String!, $version: String!, $check: String!, $answer: String!) {
    forge {
      answerValidationCheck(siteKey: $siteKey, moduleName: $moduleName, version: $version, check: $check, answer: $answer) {
        status
      }
    }
  }
`;

/**
 * A check that waits for a human, on the dashboard: the prompt to copy, and a box for the answer
 * of the assistant, which the store records as the result of the check. The page reloads once
 * the answer is recorded.
 */
export default function ValidationCheckAnswer({ siteKey, moduleName, version, checkKey, prompt, labels }: Readonly<ValidationCheckAnswerProps>) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "recording" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The clipboard is unavailable: the prompt stays readable below.
    }
  };

  const record = async () => {
    setStatus("recording");
    try {
      await gqlRequest(ANSWER_CHECK, { siteKey, moduleName, version, check: checkKey, answer });
      globalThis.location.reload();
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error && e.message ? e.message : labels.error);
    }
  };

  return (
    <div data-check-answer={checkKey} data-check-answer-ready={ready ? "true" : undefined}>
      <details className={styles.prompt}>
        <summary>{labels.prompt}</summary>
        <pre className={styles.promptText}>{prompt}</pre>
        <button type="button" className="store-btn store-btn--ghost store-btn--sm" onClick={copy}>
          {copied ? labels.copied : labels.copy}
        </button>
      </details>
      <textarea
        className={styles.answer}
        placeholder={labels.answerPlaceholder}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        aria-label={labels.answerPlaceholder}
      />
      <div className={styles.actions}>
        <button
          type="button"
          className="store-btn store-btn--sm"
          disabled={status === "recording" || answer.trim() === ""}
          onClick={record}
        >
          {status === "recording" ? labels.recording : labels.record}
        </button>
        {status === "error" && (
          <span className={styles.error} role="alert">
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
