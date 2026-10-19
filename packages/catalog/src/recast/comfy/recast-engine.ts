import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"

type Side = { width: number; height: number }

type SizeTable = Readonly<Record<string, Side>>

export const recastAspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"]

const characterSizes: Readonly<Record<"draft" | "final", SizeTable>> = {
  draft: {
    "16:9": { width: 896, height: 512 },
    "9:16": { width: 512, height: 896 },
    "1:1": { width: 512, height: 512 },
    "4:3": { width: 672, height: 512 },
    "3:4": { width: 512, height: 672 },
  },
  final: {
    "16:9": { width: 1248, height: 704 },
    "9:16": { width: 704, height: 1248 },
    "1:1": { width: 704, height: 704 },
    "4:3": { width: 928, height: 704 },
    "3:4": { width: 704, height: 928 },
  },
}

const objectSizes: Readonly<Record<"draft" | "final", SizeTable>> = {
  draft: {
    "16:9": { width: 832, height: 480 },
    "9:16": { width: 480, height: 832 },
    "1:1": { width: 480, height: 480 },
    "4:3": { width: 640, height: 480 },
    "3:4": { width: 480, height: 640 },
  },
  final: {
    "16:9": { width: 1248, height: 704 },
    "9:16": { width: 704, height: 1248 },
    "1:1": { width: 704, height: 704 },
    "4:3": { width: 928, height: 704 },
    "3:4": { width: 704, height: 928 },
  },
}

const keepSound: WorkflowValueBinding = {
  from: "input",
  name: "keepSound",
  map: { on: true, off: false },
  to: "keepSound",
}

const source: WorkflowValueBinding = {
  from: "input",
  name: "source",
  index: 0,
  to: "source",
}

function sizeBindings(sizes: SizeTable): WorkflowValueBinding[] {
  const sideOf = (side: keyof Side) =>
    Object.fromEntries(
      Object.entries(sizes).map(([ratio, size]) => [ratio, size[side]])
    )
  return [
    { from: "aspectRatio", map: sideOf("width"), to: "width" },
    { from: "aspectRatio", map: sideOf("height"), to: "height" },
  ]
}

const characterBindings: WorkflowValueBinding[] = [
  source,
  { from: "input", name: "character", index: 0, to: "character" },
  { from: "seed", to: "seed" },
  { from: "seed", to: "secondSeed" },
  {
    from: "input",
    name: "quality",
    map: { draft: 0.8, final: 0 },
    to: "distillStrength",
  },
  { from: "input", name: "quality", map: { draft: 6, final: 40 }, to: "steps" },
  { from: "input", name: "quality", map: { draft: 1, final: 5 }, to: "cfg" },
  {
    from: "input",
    name: "quality",
    map: { draft: 1, final: 5 },
    to: "secondCfg",
  },
  keepSound,
]

const objectBindings: WorkflowValueBinding[] = [
  source,
  { from: "input", name: "target", to: "target" },
  { from: "input", name: "prompt", to: "prompt" },
  { from: "seed", to: "seed" },
  { from: "seed", to: "secondSeed" },
  keepSound,
]

function byQuality(
  workflow: string,
  bindings: readonly WorkflowValueBinding[],
  sizes: Readonly<Record<"draft" | "final", SizeTable>>
): EngineBinding {
  const configFor = (quality: "draft" | "final") =>
    workflowBinding({
      workflow,
      bindings: [...bindings, ...sizeBindings(sizes[quality])],
    })
  return selectBinding({
    input: "quality",
    options: { draft: configFor("draft"), final: configFor("final") },
  })
}

export const recastEngine: EngineBinding = selectBinding({
  input: "mode",
  options: {
    character: byQuality(
      "recast-character-scail-2",
      characterBindings,
      characterSizes
    ),
    object: byQuality("recast-object-wan-vace", objectBindings, objectSizes),
  },
})
