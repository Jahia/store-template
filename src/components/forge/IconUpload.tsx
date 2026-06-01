import { useRef, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";

export interface IconLabels {
  label: string;
  choose: string;
  upload: string;
  uploading: string;
  uploaded: string;
  error: string;
  current: string;
  none: string;
  tooLarge: string;
  invalidType: string;
}

interface IconUploadProps {
  /** JCR path of the module node that owns the `icon` folder. */
  path: string;
  /** GraphQL workspace to mutate — matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** Current icon URL (server-rendered), or null when none is set yet. */
  iconUrl: string | null;
  labels: IconLabels;
}

/** Icons are small; cap the upload so a base64 payload stays reasonable in a JSON POST. */
const MAX_BYTES = 2 * 1024 * 1024;

type Status = "idle" | "uploading" | "uploaded" | "error";

/** `ws` is a server-computed enum ("EDIT" | "LIVE"), never user input — safe to interpolate. */
const findIconQuery = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  query FindIcon($path: String!) {
    jcr(workspace: ${ws}) {
      nodeByPath(path: $path) {
        children(names: ["icon"]) {
          nodes {
            uuid
            children {
              nodes {
                uuid
                primaryNodeType { name }
              }
            }
          }
        }
      }
    }
  }
`;

const addFolderMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation AddIconFolder($path: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        addChild(name: "icon", primaryNodeType: "jnt:folder") { uuid }
      }
    }
  }
`;

const deleteNodeMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation DeleteNode($id: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $id) { delete }
    }
  }
`;

/**
 * Jahia uploads a binary through plain GraphQL: `jcr:data` is set with
 * `type: BINARY` and a base64 string value (NOT a multipart Upload). This means
 * the icon upload runs over gqlRequest (fetch to /modules/graphql, not CSRF-gated)
 * just like every other owner edit — no `.do` action, no multipart.
 */
const addFileMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation AddIconFile($iconId: String!, $name: String!, $data: String!, $mime: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $iconId) {
        addChild(name: $name, primaryNodeType: "jnt:file") {
          addChild(name: "jcr:content", primaryNodeType: "jnt:resource") {
            data: mutateProperty(name: "jcr:data") { setValue(type: BINARY, value: $data) }
            mime: mutateProperty(name: "jcr:mimeType") { setValue(value: $mime) }
          }
        }
      }
    }
  }
`;

interface FindIconResult {
  jcr?: {
    nodeByPath?: {
      children?: {
        nodes?: { uuid: string; children?: { nodes?: { uuid: string; primaryNodeType?: { name?: string } }[] } }[];
      };
    };
  };
}

interface AddFolderResult {
  jcr?: { mutateNode?: { addChild?: { uuid?: string } } };
}

/** Read a File as a bare base64 string (strip the `data:<mime>;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    });
    reader.addEventListener("error", () => reject(new Error("Could not read file")));
    reader.readAsDataURL(file);
  });
}

/** JCR-safe child name derived from the picked file name. */
function safeFileName(name: string): string {
  const cleaned = name.trim().replaceAll(/[^\w.-]+/g, "_").replace(/^_+/, "");
  return cleaned || "icon";
}

/**
 * In-site module icon upload (owner-only; rendered inside the ModuleEditor, which
 * the server gates on jcr:write). The icon is the first jnt:file inside the
 * module's `icon` folder, so an upload: ensures that folder exists, removes any
 * existing files, then adds the new one. Workspace-aware — live-authored modules
 * live in LIVE, where an EDIT write would not find them.
 */
export default function IconUpload({ path, workspace, iconUrl, labels }: Readonly<IconUploadProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  // Object-URL preview of the picked/just-uploaded file (avoids recomputing the
  // server URL); falls back to the server-rendered icon.
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const pick = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.type.startsWith("image/")) {
      setStatus("error");
      setMessage(labels.invalidType);
      return;
    }
    if (next.size > MAX_BYTES) {
      setStatus("error");
      setMessage(labels.tooLarge);
      return;
    }
    setFile(next);
    setStatus("idle");
    setMessage("");
    setPreview(URL.createObjectURL(next));
  };

  const upload = async () => {
    if (!file) return;
    setStatus("uploading");
    try {
      const base64 = await fileToBase64(file);

      const found = await gqlRequest<FindIconResult>(findIconQuery(workspace), { path });
      const iconNode = found.jcr?.nodeByPath?.children?.nodes?.[0];

      let iconId: string;
      if (iconNode) {
        iconId = iconNode.uuid;
        const files = (iconNode.children?.nodes ?? []).filter(
          (n) => n.primaryNodeType?.name === "jnt:file",
        );
        for (const existing of files) {
          await gqlRequest(deleteNodeMutation(workspace), { id: existing.uuid });
        }
      } else {
        const created = await gqlRequest<AddFolderResult>(addFolderMutation(workspace), { path });
        const uuid = created.jcr?.mutateNode?.addChild?.uuid;
        if (!uuid) throw new Error("Could not create the icon folder");
        iconId = uuid;
      }

      await gqlRequest(addFileMutation(workspace), {
        iconId,
        name: safeFileName(file.name),
        data: base64,
        mime: file.type,
      });

      setStatus("uploaded");
      setMessage(labels.uploaded);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  };

  const shown = preview ?? iconUrl;

  return (
    <div className={styles.icon} data-icon-status={status}>
      <span className={styles.fieldLabel}>{labels.label}</span>
      <div className={styles.iconRow}>
        <div className={styles.iconPreview}>
          {shown ? (
            <img src={shown} alt="" width="64" height="64" />
          ) : (
            <span className={styles.iconNone} aria-hidden="true">
              {labels.none}
            </span>
          )}
        </div>
        <div className={styles.iconControls}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            data-icon-input=""
            aria-label={labels.choose}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className={clsx(styles.btn, styles.primary)}
            disabled={!file || status === "uploading"}
            onClick={upload}
          >
            {status === "uploading" ? labels.uploading : labels.upload}
          </button>
        </div>
      </div>
      {status === "uploaded" && <output className={styles.saved}>{message}</output>}
      {status === "error" && (
        <span className={styles.error} role="alert">
          {message}
        </span>
      )}
    </div>
  );
}
