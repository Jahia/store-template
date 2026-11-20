import clsx from "clsx";
import styles from "./validation.module.css";
import type { Validation, ValidationStatus } from "./validation";

export interface ValidationLabels {
  title: string;
  statuses: Record<ValidationStatus, string>;
  none: string;
  reason: string;
}

/** The status badge of a validation or of one of its checks. */
export function StatusBadge({ status, label }: Readonly<{ status: ValidationStatus; label: string }>): JSX.Element {
  return (
    <span className={clsx(styles.badge, styles[status])} data-validation-status={status}>
      {label}
    </span>
  );
}

/**
 * The validation of a version as a developer reads it: the overall status, then one line per
 * check with what the check means, its status and its comments. The tools behind the checks
 * are never named.
 */
export function ValidationSummary({
  validation,
  labels,
}: Readonly<{ validation: Validation | null; labels: ValidationLabels }>): JSX.Element {
  if (!validation) {
    return (
      <div className={styles.summary} data-validation="none">
        <strong>{labels.title}</strong> <StatusBadge status="pending" label={labels.none} />
      </div>
    );
  }
  return (
    <div className={styles.summary} data-validation={validation.status}>
      <div className={styles.head}>
        <strong>{labels.title}</strong> <StatusBadge status={validation.status} label={labels.statuses[validation.status]} />
      </div>
      {validation.reason && (
        <p className={styles.reason}>
          <strong>{labels.reason}</strong> {validation.reason}
        </p>
      )}
      <ul className={styles.checks}>
        {validation.checks.map((check) => (
          <li key={check.key} className={styles.check} data-validation-check={check.key}>
            <span className={styles.checkLabel}>{check.label}</span>{" "}
            <StatusBadge status={check.status} label={labels.statuses[check.status]} />
            {check.comments.length > 0 && (
              <ul className={styles.comments}>
                {check.comments.map((comment, i) => (
                  <li key={i}>{comment}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
