import clsx from "clsx";
import styles from "./validation.module.css";
import type { Validation, ValidationCheck, ValidationStatus } from "./validation";

export interface ValidationStepsLabels {
  title: string;
  validated: string;
  rejected: string;
  statuses: Record<ValidationStatus, string>;
  /** The step of a version that was never validated. */
  none: string;
}

/** The state a step shows: grey before it runs, orange while it runs or waits, green once passed, red when it fails. */
export type StepState = "todo" | "progress" | "done" | "failed";

export function stepState(status: ValidationStatus | "none"): StepState {
  switch (status) {
    case "approved":
      return "done";
    case "review":
      return "progress";
    case "rejected":
      return "failed";
    default:
      return "todo";
  }
}

/** The steps of a validation, when it was never requested: every registered check, still to do. */
export interface StepDefinition {
  key: string;
  label: string;
  description: string;
}

interface ValidationStepsProps {
  /** The validation of the version, or null when it was never validated. */
  validation: Validation | null;
  /** The checks of the store, shown as steps to do while the version was never validated. */
  steps?: StepDefinition[];
  labels: ValidationStepsLabels;
  /** Shown beside the chain: a control to start or run the validation again. */
  action?: JSX.Element | null;
}

/**
 * The validation of a version as a chain of steps: one per check, in the order of the checks,
 * each with its name and what it looks at, then the final "Validated" step. A step is grey until
 * it runs, orange while it waits for an answer, green once it passes and red when it fails; the
 * last step turns green when every check passed, red when the version is rejected.
 */
export function ValidationSteps({ validation, steps = [], labels, action }: Readonly<ValidationStepsProps>): JSX.Element {
  const checks: (ValidationCheck | StepDefinition)[] = validation ? validation.checks : steps;
  const overall: ValidationStatus | "none" = validation ? validation.status : "none";
  const finalState: StepState = overall === "approved" ? "done" : overall === "rejected" ? "failed" : "todo";
  return (
    <div className={styles.steps} data-validation={overall} data-validation-steps="">
      <div className={styles.stepsHead}>
        <strong>{labels.title}</strong>
        {action}
      </div>
      <ol className={styles.chain}>
        {checks.map((check, index) => {
          const status: ValidationStatus | "none" = "status" in check ? check.status : "none";
          const state = stepState(status);
          const comments = "comments" in check ? check.comments : [];
          return (
            <li key={check.key} className={clsx(styles.step, styles[`step_${state}`])} data-validation-step={check.key} data-step-state={state}>
              <span className={styles.stepMarker} aria-hidden="true">
                {state === "done" ? "✓" : state === "failed" ? "✕" : index + 1}
              </span>
              <span className={styles.stepBody}>
                <span className={styles.stepName}>{check.label}</span>
                <span className={styles.stepDescription}>{check.description}</span>
                <span className={styles.stepStatus}>{status === "none" ? labels.none : labels.statuses[status]}</span>
                {comments.length > 0 && (
                  <ul className={styles.stepComments}>
                    {comments.map((comment, i) => (
                      <li key={i}>{comment}</li>
                    ))}
                  </ul>
                )}
              </span>
            </li>
          );
        })}
        <li className={clsx(styles.step, styles.stepFinal, styles[`step_${finalState}`])} data-validation-step="validated" data-step-state={finalState}>
          <span className={styles.stepMarker} aria-hidden="true">
            {finalState === "done" ? "✓" : finalState === "failed" ? "✕" : "●"}
          </span>
          <span className={styles.stepBody}>
            <span className={styles.stepName}>{finalState === "failed" ? labels.rejected : labels.validated}</span>
            {validation?.reason && <span className={styles.stepComments}>{validation.reason}</span>}
          </span>
        </li>
      </ol>
    </div>
  );
}
