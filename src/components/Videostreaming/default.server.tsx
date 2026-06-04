import { jahiaComponent } from "@jahia/javascript-modules-library";
import { str } from "~/components/forge/nodeProps";
import styles from "~/components/forge/video.module.css";

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
    if (provider === "youtube" && id) src = `https://www.youtube.com/embed/${id}`;
    else if (provider === "vimeo" && id) src = `https://player.vimeo.com/video/${id}`;

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
