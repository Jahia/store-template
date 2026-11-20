import type { TFunction } from "i18next";
import type { ValidationLabels } from "./ValidationBadge";

/** The labels of the validation block, built server-side and passed to the components. */
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
