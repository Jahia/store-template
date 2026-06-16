// React 19's @types/react moved the JSX namespace under `React.JSX` and no longer declares a
// GLOBAL `JSX` namespace. This module's components annotate return types as `JSX.Element` and the
// tsconfig uses `jsx: "preserve"` (the Vite/esbuild build does the real transform), so `tsc`
// needs the global namespace to exist. Re-expose it as an alias of `React.JSX` so type-checking
// resolves without rewriting every annotation. The build itself is unaffected (SECURITY-571).
import type * as React from "react";

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementType = React.JSX.ElementType;
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
  }
}
