import type { ComponentType, HTMLAttributes, Ref } from "react";

/**
 * The render type for a primitive that takes an `as` prop.
 *
 * `Reveal` and `DisplayLines` both accept an element name and render it with a
 * ref, an id and a className — three attributes every HTML element has. React's
 * own `ElementType` used to describe that perfectly.
 *
 * Phase Two made it stop working. react-three-fiber declares its ~90 scene
 * objects by augmenting the global `React.JSX.IntrinsicElements`, so from the
 * moment the renderer is in the type graph, `ElementType` also means `<mesh>`,
 * `<bufferGeometry>` and `<pointLight>`. TypeScript then resolves the props
 * these primitives may pass to the *intersection* of every element in that
 * union — which, once a mesh is in it, is `never`.
 *
 * Casting the tag through this type restores the original intent: whatever the
 * caller passed, render it as an HTML element and let it take HTML attributes.
 * It is a type-level statement only — nothing about what these primitives do at
 * runtime changed, and neither did their public API.
 */
export type PolymorphicTag = ComponentType<
  HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement | null> }
>;
