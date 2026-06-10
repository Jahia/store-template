import { useRef, useState } from "react";
import clsx from "clsx";
import styles from "./editor.module.css";
import { gqlRequest, gqlUpload } from "~/lib/graphql";

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
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** Current icon URL (server-rendered), or null when none is set yet. */
  iconUrl: string | null;
  labels: IconLabels;
}

/** Icons are small; cap the upload so the multipart part stays reasonable (the file
    is sent as a GraphQL multipart request part via gqlUpload, not a base64 JSON value). */
const MAX_BYTES = 2 * 1024 * 1024;

/** Raster image types only. SVG is deliberately excluded: image/svg+xml can carry
    scripts when served inline, and the stored jcr:mimeType drives how Jahia serves
    the file back. The same list feeds the input's `accept` attribute. */
const ALLOWED_ICON_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;

type Status = "idle" | "uploading" | "uploaded" | "error";

/** `ws` is a server-computed enum ("EDIT" | "LIVE"), never user input - safe to interpolate. */
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
 * Jahia reads a BINARY property value from a multipart request part, so the file
 * is uploaded with a GraphQL multipart request (gqlUpload): `$file` is mapped to
 * the uploaded part and passed to `setValue(type: BINARY)`. A base64 JSON value
 * fails with "Cannot read parts". /modules/graphql is not CSRF-gated.
 */
const addFileMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation AddIconFile($iconId: String!, $name: String!, $file: String!, $mime: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $iconId) {
        addChild(name: $name, primaryNodeType: "jnt:file") {
          addChild(name: "jcr:content", primaryNodeType: "jnt:resource") {
            data: mutateProperty(name: "jcr:data") { setValue(type: BINARY, value: $file) }
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

/** JCR-safe child name derived from the picked file name. */
function safeFileName(name: string): string {
  const cleaned = name.trim().replaceAll(/[^\w.-]+/g, "_").replace(/^_+/, "");
  return cleaned || "icon";
}

/**
 * In-site module icon upload (owner-only; rendered inside the ModuleEditor, which
 * the server gates on jcr:write). The icon is the first jnt:file inside the
 * module's `icon` folder, so an upload: ensures that folder exists, removes any
 * existing files, then adds the new one. Workspace-aware - live-authored modules
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
    if (!(ALLOWED_ICON_TYPES as readonly string[]).includes(next.type)) {
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

      await gqlUpload(
        addFileMutation(workspace),
        { iconId, name: safeFileName(file.name), mime: file.type },
        file,
      );

      setStatus("uploaded");
      setMessage(labels.uploaded);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  };

  // The preview only ever displays a browser-minted `blob:` object-URL (created by
  // URL.createObjectURL above); anything else falls back to the server-rendered icon.
  // The scheme guard makes that invariant explicit (CodeQL js/xss-through-dom).
  const shown = preview?.startsWith("blob:") ? preview : iconUrl;

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
            accept={ALLOWED_ICON_TYPES.join(",")}
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
