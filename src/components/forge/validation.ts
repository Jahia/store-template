import type { JCRNodeWrapper, JCRSessionWrapper } from "org.jahia.services.content";
import { str, strValues } from "./nodeProps";

/** The status of a check or of a version, as the store records it (jahia-store docs/validation.md). */
export type ValidationStatus = "pending" | "approved" | "review" | "rejected";

export interface ValidationCheck {
  key: string;
  label: string;
  /** One sentence on what the check looks at. */
  description: string;
  /** The place of the check among the steps. */
  order: number;
  status: ValidationStatus;
  comments: string[];
  /** The prompt a human follows to answer the check, when it waits for one. */
  prompt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Validation {
  moduleName: string;
  version: string;
  status: ValidationStatus;
  artifactUrl: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  checks: ValidationCheck[];
}

const STATUSES: ValidationStatus[] = ["pending", "approved", "review", "rejected"];

function statusOf(value: string): ValidationStatus {
  return (STATUSES as string[]).includes(value) ? (value as ValidationStatus) : "pending";
}

function readValidation(node: JCRNodeWrapper): Validation {
  const checks: ValidationCheck[] = [];
  const iterator = node.getNodes();
  while (iterator.hasNext()) {
    const child = iterator.nextNode() as unknown as JCRNodeWrapper;
    if (!child.isNodeType("jnt:forgeValidationCheck")) continue;
    checks.push({
      key: str(child, "checkKey") || child.getName(),
      label: str(child, "label") || child.getName(),
      description: str(child, "description"),
      order: child.hasProperty("stepOrder") ? Number(child.getProperty("stepOrder").getLong()) : 100,
      status: statusOf(str(child, "status")),
      comments: strValues(child, "comments"),
      prompt: str(child, "prompt"),
      updatedBy: str(child, "updatedBy"),
      updatedAt: str(child, "updatedAt").slice(0, 16).replace("T", " "),
    });
  }
  checks.sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
  return {
    moduleName: str(node, "moduleName"),
    version: str(node, "versionNumber"),
    status: statusOf(str(node, "status")),
    artifactUrl: str(node, "artifactUrl"),
    requestedBy: str(node, "requestedBy"),
    requestedAt: str(node, "requestedAt").slice(0, 16).replace("T", " "),
    reason: str(node, "reason"),
    checks,
  };
}

/**
 * The checks of the store as steps to do, for a version that was never validated: the ones
 * of the newest record of the site, which every record of the store carries alike. Empty when
 * the site holds no record yet.
 */
export function storeSteps(session: JCRSessionWrapper, siteKey: string): { key: string; label: string; description: string }[] {
  const latest = validationsOf(session, siteKey)[0];
  return latest ? latest.checks.map(({ key, label, description }) => ({ key, label, description })) : [];
}

/** The validation record of a version, published beside the site content, or null when it was never validated. */
export function validationOf(
  session: JCRSessionWrapper,
  siteKey: string,
  moduleName: string,
  version: string,
): Validation | null {
  if (!/^[A-Za-z0-9._-]+$/.test(moduleName) || !/^[A-Za-z0-9._-]+$/.test(version)) return null;
  const path = `/sites/${siteKey}/contents/validations/${moduleName}/${version}`;
  try {
    if (!session.nodeExists(path)) return null;
    return readValidation(session.getNode(path));
  } catch {
    return null;
  }
}

/** Every validation record of a site, the newest request first. */
export function validationsOf(session: JCRSessionWrapper, siteKey: string): Validation[] {
  const folder = `/sites/${siteKey}/contents/validations`;
  const records: Validation[] = [];
  try {
    if (!session.nodeExists(folder)) return records;
    const modules = session.getNode(folder).getNodes();
    while (modules.hasNext()) {
      const module = modules.nextNode() as unknown as JCRNodeWrapper;
      const versions = module.getNodes();
      while (versions.hasNext()) {
        const version = versions.nextNode() as unknown as JCRNodeWrapper;
        if (version.isNodeType("jnt:forgeValidation")) records.push(readValidation(version));
      }
    }
  } catch {
    // An unreadable folder reads as no record.
  }
  return records.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

/** The version node a validation record names, under the modules repository of the site, or null. */
export function versionNodeOf(session: JCRSessionWrapper, siteKey: string, validation: Validation): JCRNodeWrapper | null {
  const modulePath = `/sites/${siteKey}/contents/modules-repository/${validation.moduleName}`;
  try {
    if (!session.nodeExists(modulePath)) return null;
    const versions = session.getNode(modulePath).getNodes();
    while (versions.hasNext()) {
      const node = versions.nextNode() as unknown as JCRNodeWrapper;
      if (node.isNodeType("jnt:forgeModuleVersion") && (str(node, "versionNumber") || node.getName()) === validation.version) {
        return node;
      }
    }
  } catch {
    // Unreadable module: no node.
  }
  return null;
}
