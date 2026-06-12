import { useState } from "react";
import styles from "./editor.module.css";
import { gqlRequest } from "~/lib/graphql";

export interface VideoLabels {
  heading: string;
  provider: string;
  providerNone: string;
  providerYoutube: string;
  providerVimeo: string;
  identifier: string;
  identifierHelp: string;
  save: string;
  saving: string;
  saved: string;
  invalidId: string;
  error: string;
}

interface VideoManagerProps {
  /** Module/package node path; the video lives in its `video` child node. */
  path: string;
  /** GraphQL workspace to mutate - matches the workspace the page is rendered in. */
  workspace: "EDIT" | "LIVE";
  /** Current provider ("youtube" | "vimeo" | "") and identifier, server-rendered. */
  provider: string;
  identifier: string;
  /** Whether a `video` child node already exists (so we know to create vs. update/delete). */
  hasVideo: boolean;
  labels: VideoLabels;
}

/** A YouTube/Vimeo video id is a plain token; reject anything that could smuggle a path or
    query into the embed URL (mirrors the server-side guard in Videostreaming). */
const SAFE_VIDEO_ID = /^[A-Za-z0-9_-]+$/;

/** `ws` is a server-computed enum, never user input - safe to interpolate. */
const addVideoMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation AddVideo($path: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        addChild(name: "video", primaryNodeType: "jnt:videostreaming") { uuid }
      }
    }
  }
`;

const setVideoMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation SetVideo($path: String!, $provider: String!, $identifier: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) {
        provider: mutateProperty(name: "provider") { setValue(value: $provider) }
        identifier: mutateProperty(name: "identifier") { setValue(value: $identifier) }
      }
    }
  }
`;

const deleteVideoMutation = (ws: "EDIT" | "LIVE") => /* GraphQL */ `
  mutation DeleteVideo($path: String!) {
    jcr(workspace: ${ws}) {
      mutateNode(pathOrId: $path) { delete }
    }
  }
`;

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Owner-facing video manager (rendered in the editor's Media tab). Sets the
 * module's single `video` (jnt:videostreaming) child: pick a provider
 * (YouTube/Vimeo) + paste the video id, or choose "None" to remove it. Writes go
 * through the generic jcr mutations (session-authenticated, JCR ACLs apply) - no
 * custom Java. The id is validated against the same token charset the renderer
 * enforces, so a saved value can never steer the embed iframe elsewhere.
 */
export default function VideoManager({
  path,
  workspace,
  provider,
  identifier,
  hasVideo,
  labels,
}: Readonly<VideoManagerProps>) {
  const videoPath = `${path}/video`;
  const [providerValue, setProviderValue] = useState(provider);
  const [idValue, setIdValue] = useState(identifier);
  const [exists, setExists] = useState(hasVideo);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const save = async () => {
    setStatus("saving");
    setMessage("");
    try {
      if (!providerValue) {
        // "None" selected: remove the video node if one exists.
        if (exists) await gqlRequest(deleteVideoMutation(workspace), { path: videoPath });
        setExists(false);
        setIdValue("");
        setStatus("saved");
        setMessage(labels.saved);
        return;
      }
      const id = idValue.trim();
      if (!SAFE_VIDEO_ID.test(id)) {
        setStatus("error");
        setMessage(labels.invalidId);
        return;
      }
      if (!exists) await gqlRequest(addVideoMutation(workspace), { path });
      await gqlRequest(setVideoMutation(workspace), {
        path: videoPath,
        provider: providerValue,
        identifier: id,
      });
      setExists(true);
      setIdValue(id);
      setStatus("saved");
      setMessage(labels.saved);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  };

  return (
    <section className={styles.media} data-video-manager="">
      <h3 className={styles.mediaHeading}>{labels.heading}</h3>
      <div className={styles.field}>
        <label htmlFor="edit-video-provider">{labels.provider}</label>
        <select
          id="edit-video-provider"
          className={styles.select}
          value={providerValue}
          onChange={(e) => setProviderValue(e.target.value)}
        >
          <option value="">{labels.providerNone}</option>
          <option value="youtube">{labels.providerYoutube}</option>
          <option value="vimeo">{labels.providerVimeo}</option>
        </select>
      </div>
      {providerValue && (
        <div className={styles.field}>
          <label htmlFor="edit-video-id">{labels.identifier}</label>
          <input
            id="edit-video-id"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            data-video-id=""
          />
          <p className={styles.muted}>{labels.identifierHelp}</p>
        </div>
      )}
      <div className={styles.mediaActions}>
        <button
          type="button"
          className="store-btn store-btn--primary store-btn--sm"
          disabled={status === "saving"}
          onClick={save}
          data-video-save
        >
          {status === "saving" ? labels.saving : labels.save}
        </button>
        {status === "saved" && <output className={styles.saved}>{message}</output>}
        {status === "error" && (
          <span className={styles.error} role="alert">
            {message}
          </span>
        )}
      </div>
    </section>
  );
}
