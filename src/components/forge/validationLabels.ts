import type { TFunction } from "i18next";
import type { ValidationLabels } from "./ValidationBadge";
import type { ValidationStepsLabels } from "./ValidationSteps";

/** The labels of the validation block of the dashboard, built server-side and passed to the components. */
export function validationLabels(t: TFunction): ValidationLabels {
  return {
    title: t("validation.title"),
    none: t("validation.status.none"),
    reason: t("validation.reason"),
    statuses: {
      pending: t("validation.status.pending"),
      approved: t("validation.status.approved"),
      review: t("validation.status.review"),
      rejected: t("validation.status.rejected"),
    },
  };
}

/** The labels of the steps of a validation. */
export function validationStepsLabels(t: TFunction): ValidationStepsLabels {
  return {
    title: t("validation.title"),
    validated: t("validation.steps.validated"),
    rejected: t("validation.steps.rejected"),
    none: t("validation.steps.none"),
    statuses: {
      pending: t("validation.status.pending"),
      approved: t("validation.status.approved"),
      review: t("validation.status.review"),
      rejected: t("validation.status.rejected"),
    },
  };
}
