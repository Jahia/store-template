import { jahiaComponent } from "@jahia/javascript-modules-library";
import { str } from "~/components/forge/nodeProps";
import styles from "~/components/forge/video.module.css";

/**
 * YouTube / Vimeo video ids are plain tokens (YouTube: 11 url-safe chars, Vimeo: digits).
 * The identifier is author-supplied, so anything else (slashes, dots, query chars) is
 * rejected rather than letting an author steer the iframe to another path on the provider.
 */
const SAFE_VIDEO_ID = /^[A-Za-z0-9_-]+$/;

/**
 * Video embed for a jnt:videostreaming node (YouTube / Vimeo), from its
 * `provider` + `identifier` properties. Replaces the legacy lity-based view.
 */
jahiaComponent(
  { nodeType: "jnt:videostreaming", name: "default", displayName: "Video", componentType: "view" },
  (_props: object, { currentNode }) => {
    const provider = str(currentNode, "provider");
    const id = str(currentNode, "identifier");

    let src: string | null = null;
    if (id && SAFE_VIDEO_ID.test(id)) {
      if (provider === "youtube") src = `https://www.youtube.com/embed/${id}`;
      else if (provider === "vimeo") src = `https://player.vimeo.com/video/${id}`;
    }

    if (!src) return <></>;

    return (
      <div className={styles.videoWrap}>
        <iframe
          className={styles.video}
          src={src}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  },
);
