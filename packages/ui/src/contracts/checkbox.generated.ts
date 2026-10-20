// Generated. Do not edit.

export const CHECKBOX = {
  id: "checkbox",
  name: "Checkbox",
  slots: ["check"],
  variants: {
    feedback: {
      values: ["press", "none"],
      default: "press",
    },
    form: {
      values: ["control", "row"],
      default: "control",
    },
    mark: {
      values: ["trailing", "leading"],
      default: "trailing",
    },
    look: {
      values: ["line", "card"],
      default: "line",
    },
  },
  states: ["off", "on", "focusVisible", "disabled"],
  sizes: {
    box: {
      phone: "control.checkbox",
      tablet: "control.checkbox",
      desktop: "control.checkbox",
    },
    radius: {
      phone: "radius.r2",
      tablet: "radius.r2",
      desktop: "radius.r2",
    },
    check: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "control.checkbox": ["--spacing-checkbox"],
    "icon.smSize": ["--spacing-glyph-small"],
    "radius.r2": ["--radius-dense"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "fill",
      preset: "tint",
      motion: "none",
    },
    {
      part: "check",
      preset: "enter",
      motion: "none",
    },
  ],
} as const

export type CheckboxSlot = (typeof CHECKBOX.slots)[number]
export type CheckboxState = (typeof CHECKBOX.states)[number]
export type CheckboxFeedback =
  (typeof CHECKBOX.variants.feedback.values)[number]
export type CheckboxForm = (typeof CHECKBOX.variants.form.values)[number]
export type CheckboxMark = (typeof CHECKBOX.variants.mark.values)[number]
export type CheckboxLook = (typeof CHECKBOX.variants.look.values)[number]
