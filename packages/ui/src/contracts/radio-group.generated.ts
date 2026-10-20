// Generated. Do not edit.

export const RADIO_GROUP = {
  id: "radio-group",
  name: "RadioGroup",
  slots: [],
  variants: {
    form: {
      values: ["stack", "rows"],
      default: "stack",
    },
  },
  states: ["rest", "disabled"],
  sizes: {
    gap: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
  },
  variables: {
    "space.s3": ["--spacing-s3"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [],
} as const

export type RadioGroupSlot = (typeof RADIO_GROUP.slots)[number]
export type RadioGroupState = (typeof RADIO_GROUP.states)[number]
export type RadioGroupForm = (typeof RADIO_GROUP.variants.form.values)[number]
