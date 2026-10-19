import { type AppInput, defineApp } from "#define-app"
import { motionBinding } from "#motion/comfy/motion-binding"

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
      maxLength: 500,
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
    aspectRatios: {
      options: ["1:1", "4:3", "3:4", "16:9", "9:16"],
      default: "9:16",
    },
  },
  engine: motionBinding,
  limits: { timeoutSeconds: 1800, maxRetries: 2 },
})
