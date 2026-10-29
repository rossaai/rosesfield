import type { WorkflowValueBinding } from "#workflow-binding"

/**
 * A stub of the guided render's binding, until feature/motion-render-core merges.
 * Its inputs are the inputBindings of workflows/motion-guide-ltx-2-5/entry.json as that branch held them on 2026-10-29:
 * the photo, the guide clip and the mask are uploaded assets, the end key is an optional asset, and the scene, the short side and the seed are values.
 */
export const renderCoreStub = {
  model: "ltx-2-5-guide",
  bindings: [
    { from: "input", name: "photo", index: 0, to: "photo" },
    { from: "input", name: "clip", index: 0, to: "clip" },
    { from: "input", name: "mask", index: 0, to: "mask" },
    { from: "input", name: "endKey", index: 0, to: "endKey" },
    { from: "input", name: "scene", to: "scene" },
    { from: "input", name: "shortSide", to: "shortSide" },
    { from: "seed", to: "seed" },
  ] satisfies WorkflowValueBinding[],
  optional: ["endKey"],
  shortSides: { draft: 512, final: 768 },
}
