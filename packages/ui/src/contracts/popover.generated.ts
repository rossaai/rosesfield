// Generated. Do not edit.

export const POPOVER = {
  id: "popover",
  name: "Popover",
  slots: ["trigger", "head", "body"],
  variants: {
    side: {
      values: ["top", "bottom", "left", "right"],
      default: "bottom",
    },
    align: {
      values: ["start", "center", "end"],
      default: "start",
    },
    measure: {
      values: ["hug", "capped"],
      default: "hug",
    },
  },
  states: ["closed", "opening", "open", "closing"],
  sizes: {
    offset: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    minWidth: {
      phone: "component.popover.minWidth",
      tablet: "component.popover.minWidth",
      desktop: "component.popover.minWidth",
    },
    maxWidth: {
      phone: "component.popover.maxWidth",
      tablet: "component.popover.maxWidth",
      desktop: "component.popover.maxWidth",
    },
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
    wordsInset: {
      phone: "space.s4",
      tablet: "space.s4",
      desktop: "space.s4",
    },
  },
  variables: {
    "component.popover.maxWidth": ["--spacing-popover-max"],
    "component.popover.minWidth": ["--spacing-popover-min"],
    "radius.r8": ["--radius-vessel"],
    "space.s2": ["--spacing-s2"],
    "space.s4": ["--spacing-s4"],
  },
  material: {
    material: "material.regular",
    ground: "color.layer",
  },
  motion: [
    {
      part: "panel",
      preset: "popover",
      motion: "none",
    },
  ],
} as const

export type PopoverSlot = (typeof POPOVER.slots)[number]
export type PopoverState = (typeof POPOVER.states)[number]
export type PopoverSide = (typeof POPOVER.variants.side.values)[number]
export type PopoverAlign = (typeof POPOVER.variants.align.values)[number]
export type PopoverMeasure = (typeof POPOVER.variants.measure.values)[number]
