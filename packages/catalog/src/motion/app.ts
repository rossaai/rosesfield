import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { clipPlanLimits } from "#motion/clip-plan"
import { ltx25GuideInputs } from "#motion/comfy/guide-ltx-2-5-binding"
import { motionEngine } from "#motion/comfy/motion-binding"
import { readClipInputs } from "#motion/comfy/read-clip-binding"
import {
  graphModel,
  guideModel,
  ltx25GuideModel,
  motionTasks,
  readClipModel,
} from "#motion/motion-models"

/** The label of an input or option a run chain fills. No surface shows it, so it names the app. */
const chainLabel = "motion.name"

const renderModels = [graphModel, guideModel, ltx25GuideModel]

export const motionAspectRatios: readonly string[] = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
]

export const app: AppInput = defineApp({
  id: "motion",
  nameKey: "motion.name",
  category: "video",
  inputs: [
    {
      type: "choice",
      name: "model",
      labelKey: "motion.input.model.label",
      options: [
        { value: graphModel, labelKey: "motion.model.ltx23" },
        { value: guideModel, labelKey: "motion.model.ltx23Guide" },
        { value: ltx25GuideModel, labelKey: chainLabel, fill: "chain" },
        { value: readClipModel, labelKey: chainLabel, fill: "chain" },
      ],
      default: graphModel,
    },
    {
      type: "image",
      name: "photo",
      labelKey: "motion.input.photo.label",
      presence: "required",
      max: 1,
      when: [{ input: "model", is: renderModels }],
    },
    {
      type: "video",
      name: "clip",
      labelKey: "motion.input.clip.label",
      presence: "required",
      max: 1,
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
      type: "toggle",
      name: "sound",
      labelKey: "motion.input.sound.label",
      default: "off",
    },
    {
      type: "prompt",
      name: "scene",
      labelKey: "motion.input.scene.label",
      presence: "optional",
      maxLength: 2000,
    },
    {
      type: "choice",
      name: "resolution",
      labelKey: "motion.input.resolution.label",
      options: [
        { value: "480p", labelKey: "motion.choice.resolution.p480" },
        { value: "720p", labelKey: "motion.choice.resolution.p720" },
      ],
      default: "720p",
    },
    { type: "seed", name: "seed", labelKey: "motion.input.seed.label" },
  ],
  output: {
    kind: "video",
    count: { default: 1, max: 1 },
    aspectRatios: { options: [...motionAspectRatios], default: "9:16" },
  },
  engine: taskBinding({
    tasks: motionTasks,
    input: "model",
    default: graphModel,
    fallback: motionEngine,
  }),
  limits: { timeoutSeconds: 1800, maxRetries: 2 },
})
