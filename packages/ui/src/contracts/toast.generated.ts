// Generated. Do not edit.

export const TOAST = {
  id: "toast",
  name: "Toast",
  slots: ["glyph", "text", "act"],
  variants: {
    tone: {
      values: ["fault", "done"],
      default: "fault",
    },
  },
  states: ["entering", "shown", "stacked", "wrapped", "leaving"],
  sizes: {
    maxWidth: {
      phone: "component.toast.maxWidth",
      tablet: "component.toast.maxWidth",
      desktop: "component.toast.maxWidth",
    },
    screenMargin: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    glyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    slotGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    textSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    textLine: {
      phone: "type.subheadLine",
      tablet: "type.subheadLine",
      desktop: "type.subheadLine",
    },
    act: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    radius: {
      phone: "radius.r6",
      tablet: "radius.r6",
      desktop: "radius.r6",
    },
    dwell: {
      phone: "motion.dwell.toast",
      tablet: "motion.dwell.toast",
      desktop: "motion.dwell.toast",
    },
  },
  material: {
    material: "material.regular",
    ground: "color.layer",
  },
  motion: [
    {
      part: "card",
      preset: "enter",
      motion: "none",
    },
  ],
} as const

export type ToastSlot = (typeof TOAST.slots)[number]
export type ToastState = (typeof TOAST.states)[number]
export type ToastTone = (typeof TOAST.variants.tone.values)[number]
