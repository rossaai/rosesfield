import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { clipPlanLimits } from "#motion/clip-plan"
import { clipPlanInputs } from "#motion/comfy/clip-plan-binding"
import { ltx25GuideInputs } from "#motion/comfy/guide-ltx-2-5-binding"
import { motionEngine } from "#motion/comfy/motion-binding"
import { readClipInputs } from "#motion/comfy/read-clip-binding"
import { swapInputs } from "#motion/comfy/swap-ltx-2-3-binding"
import {
  exampleInput,
  examplesBinding,
  ownVideo,
} from "#motion/examples/example-binding"
import type { LibraryExample } from "#motion/examples/library-example.contract"
import {
  approvedExamples,
  exampleKeyOf,
} from "#motion/examples/library-examples"
import {
  graphModel,
  guideModel,
  ltx25GuideModel,
  motionTasks,
  planModel,
  readClipModel,
  swapModel,
} from "#motion/motion-models"

/** The label of an input or option a run chain fills. No surface shows it, so it names the app. */
const chainLabel = "motion.name"

const renderModels = [graphModel, guideModel, ltx25GuideModel]

const photoModels = [...renderModels, swapModel, planModel]

const twoPassModels = [graphModel, guideModel]

type AppInputs = AppInput["inputs"]

type Condition = { input: string; is: string[] }

function whenExampleIs(values: readonly string[]): Condition {
  return { input: exampleInput, is: [...values] }
}

const ownRender: Condition[] = [
  { input: "model", is: [ltx25GuideModel] },
  whenExampleIs([ownVideo]),
]

function exampleChoice(offered: readonly LibraryExample[]): AppInputs {
  return [
    {
      type: "choice",
      name: exampleInput,
      labelKey: "motion.input.clip.label",
      options: [
        { value: ownVideo, labelKey: "motion.example.own" },
        ...offered.map((example) => ({
          value: example.id,
          labelKey: `motion.example.${exampleKeyOf(example.id)}.name`,
        })),
      ],
      default: ownVideo,
    },
  ]
}

function modelChoice(): AppInputs {
  return [
    {
      type: "choice",
      name: "model",
      labelKey: "motion.input.model.label",
      options: [
        { value: ltx25GuideModel, labelKey: "motion.model.ltx25" },
        { value: graphModel, labelKey: "motion.model.ltx23" },
        { value: guideModel, labelKey: "motion.model.ltx23Guide" },
        { value: swapModel, labelKey: "motion.tab.swap" },
        { value: readClipModel, labelKey: chainLabel, fill: "chain" },
        { value: planModel, labelKey: chainLabel, fill: "chain" },
      ],
      default: ltx25GuideModel,
    },
  ]
}

function renderChainInputs(): AppInputs {
  return [
    {
      type: "image",
      name: ltx25GuideInputs.photo,
      labelKey: chainLabel,
      presence: "required",
      max: 1,
      fill: "chain",
      when: ownRender,
    },
    {
      type: "video",
      name: ltx25GuideInputs.guide,
      labelKey: chainLabel,
      presence: "required",
      max: 1,
      fill: "chain",
      when: ownRender,
    },
    {
      type: "prompt",
      name: ltx25GuideInputs.scene,
      labelKey: chainLabel,
      presence: "required",
      maxLength: clipPlanLimits.longestScene,
      fill: "chain",
      when: ownRender,
    },
  ]
}

function chainInputs(): AppInputs {
  return [
    {
      type: "image",
      name: clipPlanInputs.frames,
      labelKey: chainLabel,
      presence: "optional",
      max: clipPlanLimits.frames,
      fill: "chain",
      when: [{ input: "model", is: [planModel] }],
    },
    {
      type: "video",
      name: ltx25GuideInputs.mask,
      labelKey: chainLabel,
      presence: "optional",
      max: 1,
      fill: "chain",
      when: [{ input: "model", is: [ltx25GuideModel] }],
    },
    {
      type: "image",
      name: ltx25GuideInputs.endKey,
      labelKey: chainLabel,
      presence: "optional",
      max: 1,
      fill: "chain",
      when: [{ input: "model", is: [ltx25GuideModel] }],
    },
    {
      type: "prompt",
      name: readClipInputs.targets,
      labelKey: chainLabel,
      presence: "required",
      maxLength: clipPlanLimits.mostTargets * (clipPlanLimits.longestFind + 2),
      fill: "chain",
      when: [{ input: "model", is: [readClipModel] }],
    },
    {
      type: "choice",
      name: readClipInputs.objects,
      labelKey: chainLabel,
      options: ["1", "2", "3"].map((value) => ({
        value,
        labelKey: chainLabel,
      })),
      default: "3",
      fill: "chain",
      when: [{ input: "model", is: [readClipModel] }],
    },
  ]
}

function swapTargetInput(): AppInputs {
  return [
    {
      type: "prompt",
      name: swapInputs.target,
      labelKey: "motion.tab.swap",
      presence: "optional",
      maxLength: 200,
      when: [{ input: "model", is: [swapModel] }],
    },
  ]
}

function motionInputs(offered: readonly LibraryExample[]): AppInputs {
  const unguided = offered
    .filter((example) => example.guide === null)
    .map((example) => example.id)
  return [
    ...exampleChoice(offered),
    ...modelChoice(),
    ...renderChainInputs(),
    {
      type: "image",
      name: "photo",
      labelKey: "motion.input.photo.label",
      presence: "required",
      max: clipPlanLimits.mostPhotos,
      when: [
        { input: "model", is: photoModels },
        { input: ltx25GuideInputs.photo, state: "empty" },
      ],
    },
    {
      type: "video",
      name: "clip",
      labelKey: "motion.input.clip.label",
      presence: "required",
      max: 1,
      when: [
        whenExampleIs([ownVideo]),
        { input: ltx25GuideInputs.guide, state: "empty" },
      ],
    },
    ...chainInputs(),
    {
      type: "toggle",
      name: "sound",
      labelKey: "motion.input.sound.label",
      default: "off",
      when: [whenExampleIs([ownVideo]), { input: "model", is: twoPassModels }],
    },
    {
      type: "prompt",
      name: "scene",
      labelKey: "motion.input.scene.label",
      presence: "optional",
      maxLength: 2000,
      when: [whenExampleIs([ownVideo, ...unguided])],
    },
    ...swapTargetInput(),
    {
      type: "choice",
      name: "resolution",
      labelKey: "motion.input.resolution.label",
      options: [
        { value: "480p", labelKey: "motion.choice.resolution.p480" },
        { value: "720p", labelKey: "motion.choice.resolution.p720" },
        { value: "1080p", labelKey: "motion.choice.resolution.p1080" },
      ],
      default: "720p",
      bounds: [
        {
          when: [{ input: "model", is: twoPassModels }],
          values: ["480p", "720p"],
        },
      ],
    },
    { type: "seed", name: "seed", labelKey: "motion.input.seed.label" },
  ]
}

export function motionApp(offered: readonly LibraryExample[]): AppInput {
  return defineApp({
    id: "motion",
    nameKey: "motion.name",
    category: "video",
    inputs: motionInputs(offered),
    output: {
      kind: "video",
      count: { default: 1, max: 1 },
      aspectRatios: null,
    },
    engine: taskBinding({
      tasks: motionTasks,
      graphTasks: { [swapModel]: "character-swap" },
      input: "model",
      default: ltx25GuideModel,
      fallback: examplesBinding(offered, motionEngine),
    }),
    limits: { timeoutSeconds: 1800, maxRetries: 2 },
  })
}

export const app: AppInput = motionApp(approvedExamples)
