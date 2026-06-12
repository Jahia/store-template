/**
 * Cross-island signal: the detail-page "Edit screenshots" shortcut asks the
 * (separately-hydrated) ModuleEditor island to open on its Media tab. The two
 * islands don't share React state, so they communicate via this window
 * CustomEvent. Kept in one place so the dispatcher and the listener can't drift.
 */
export const EDIT_MEDIA_EVENT = "forge:edit-media";
