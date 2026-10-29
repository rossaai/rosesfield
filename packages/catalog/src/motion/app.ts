import { taskBinding } from "@rosesfield/generation/bindings"
import { type AppInput, defineApp } from "#define-app"
import { motionEngine } from "#motion/comfy/motion-binding"
import { graphModel, guideModel, motionTasks } from "#motion/motion-models"

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
      type: "image",
      name: "photo",
      labelKey: "motion.input.photo.label",
      presence: "required",
      max: 1,
    },
    {
      type: "video",
      name: "clip",
      labelKey: "motion.input.clip.label",
      presence: "required",
      max: 1,
    },
    {
      type: "choice",
      name: "model",
      labelKey: "motion.input.model.label",
      options: [
        { value: graphModel, labelKey: "motion.model.ltx23" },
        { value: guideModel, labelKey: "motion.model.ltx23Guide" },
      ],
      default: graphModel,
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
