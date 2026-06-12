import { useEffect, useState } from "react";
import { EDIT_MEDIA_EVENT } from "./editMediaEvent";

interface EditMediaShortcutProps {
  label: string;
}

/**
 * Owner-only shortcut shown beside the detail-page screenshots. The screenshots are
 * display-only on the detail page (managed in the editor's Media tab), so this button
 * jumps the owner straight there: it dispatches a window CustomEvent that the
 * ModuleEditor island listens for (opens itself on the Media tab). The two islands
 * hydrate independently, hence the event rather than shared React state.
 */
export default function EditMediaShortcut({ label }: Readonly<EditMediaShortcutProps>): JSX.Element {
  // Hydration marker: the click only does something once React has attached the
  // handler (and the editor island is listening), so callers/tests can wait for it.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <button
      type="button"
      className="store-btn store-btn--ghost store-btn--sm"
      data-edit-media=""
      data-edit-media-ready={ready ? "true" : undefined}
      onClick={() => window.dispatchEvent(new CustomEvent(EDIT_MEDIA_EVENT))}
    >
      {label}
    </button>
  );
}
