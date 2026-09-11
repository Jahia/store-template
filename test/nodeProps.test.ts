import { describe, it, expect } from "vitest";

// nodeProps.ts imports only TYPES from the engine, so it loads in a plain Node test without stubs.
import { releaseStamp, releaseDay } from "../src/components/forge/nodeProps";

/** Minimal JCRNodeWrapper-ish stub: only the property accessors str() touches. */
function mockNode(props: Record<string, string>) {
  return {
    hasProperty: (name: string) => Object.hasOwn(props, name),
    getProperty: (name: string) => ({ getString: () => props[name] }),
  } as never;
}

const UPLOADED = "2026-03-04T14:32:07.000+02:00";
const EDITED = "2026-07-19T09:15:00.000+02:00";

describe("releaseStamp", () => {
  it("prefers the immutable uploadDate over jcr:lastModified", () => {
    // The whole point: the node was edited in July, but it was RELEASED in March.
    const node = mockNode({ uploadDate: UPLOADED, "jcr:lastModified": EDITED });
    expect(releaseStamp(node)).toBe(UPLOADED);
  });

  it("falls back to jcr:lastModified when uploadDate is absent", () => {
    // Versions created before the property existed, or outside the upload action.
    expect(releaseStamp(mockNode({ "jcr:lastModified": EDITED }))).toBe(EDITED);
  });

  it("returns '' when neither property exists", () => {
    expect(releaseStamp(mockNode({}))).toBe("");
  });

  it("keeps the full timestamp so same-day releases still order by time", () => {
    const morning = mockNode({ uploadDate: "2026-03-04T08:00:00.000+02:00" });
    const evening = mockNode({ uploadDate: "2026-03-04T20:00:00.000+02:00" });
    expect(releaseStamp(evening) > releaseStamp(morning)).toBe(true);
  });
});

describe("releaseDay", () => {
  it("truncates the timestamp to an ISO day for display", () => {
    expect(releaseDay(mockNode({ uploadDate: UPLOADED }))).toBe("2026-03-04");
  });

  it("returns '' (caller omits the row) when there is no date at all", () => {
    expect(releaseDay(mockNode({}))).toBe("");
  });
});
