import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { sideMap } from "#storyboard/comfy/keyframe-sizes"
import type { Link } from "#storyboard/comfy/storyboard-nodes"
import {
  maxScenes,
  type StoryboardModel,
  sceneInputName,
  sceneNumbers,
} from "#storyboard/storyboard-inputs"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Row = {
  anchored: string
  fromText: string
  sizes: readonly WorkflowValueBinding[]
  firstEdit: string
  firstText: string
}

function sizeBindings(width: string, height: string): WorkflowValueBinding[] {
  return [
    { from: "aspectRatio", map: sideMap("width"), to: width },
    { from: "aspectRatio", map: sideMap("height"), to: height },
  ]
}

export const storyboardRows: Readonly<Record<StoryboardModel, Row>> = {
  "qwen-image-edit-2511": {
    anchored: "storyboard-qwen-image-edit-2511",
    fromText: "storyboard-qwen-image-edit-2511-from-text",
    sizes: sizeBindings("width", "height"),
    firstEdit: "106",
    firstText: "46",
  },
  "flux-2-klein-4b": {
    anchored: "storyboard-flux-2-klein-4b",
    fromText: "storyboard-flux-2-klein-4b-from-text",
    sizes: [
      ...sizeBindings("schedulerWidth", "schedulerHeight"),
      ...sizeBindings("width", "height"),
    ],
    firstEdit: "110",
    firstText: "50",
  },
}

function countMap(first: string): Record<string, Link> {
  const ends: Record<string, Link> = { "1": [first, 0] }
  for (let count = 2; count <= maxScenes; count += 1) {
    ends[String(count)] = [String(900 + count), 0]
  }
  return ends
}

function sceneBindings(): WorkflowValueBinding[] {
  return sceneNumbers.flatMap((scene): WorkflowValueBinding[] => [
    { from: "input", name: sceneInputName(scene), to: `scene${scene}` },
    { from: "input", name: "look", to: `look${scene}` },
  ])
}

type Anchor = "reference" | "character" | "keyframe"

function anchorBinding(model: StoryboardModel, anchor: Anchor): EngineBinding {
  const row = storyboardRows[model]
  const fromText = anchor === "keyframe"
  const anchorImage: WorkflowValueBinding[] = fromText
    ? []
    : [{ from: "input", name: anchor, index: 0, to: "anchor" }]
  return workflowBinding({
    workflow: fromText ? row.fromText : row.anchored,
    bindings: [
      { from: "seed", to: "seed" },
      ...anchorImage,
      ...row.sizes,
      ...sceneBindings(),
      {
        from: "count",
        map: countMap(fromText ? row.firstText : row.firstEdit),
        to: "count",
      },
    ],
  })
}

function byAnchor(model: StoryboardModel): EngineBinding {
  return selectBinding({
    input: "reference",
    by: "filled",
    options: {
      filled: anchorBinding(model, "reference"),
      empty: selectBinding({
        input: "character",
        by: "filled",
        options: {
          filled: anchorBinding(model, "character"),
          empty: anchorBinding(model, "keyframe"),
        },
      }),
    },
  })
}

export const storyboardBinding: EngineBinding = selectBinding({
  input: "model",
  options: {
    "qwen-image-edit-2511": byAnchor("qwen-image-edit-2511"),
    "flux-2-klein-4b": byAnchor("flux-2-klein-4b"),
  },
})
