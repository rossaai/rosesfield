// Generated. Do not edit.

export const SEPARATOR = {
  id: "separator",
  name: "Separator",
  slots: [],
  variants: {
    orientation: {
      values: ["horizontal", "vertical"],
      default: "horizontal",
    },
  },
  states: ["decorative", "boundary"],
  sizes: {
    thickness: {
      phone: "none",
      tablet: "none",
      desktop: "none",
    },
    color: {
      phone: "color.surface2",
      tablet: "color.surface2",
      desktop: "color.surface2",
    },
  },
  variables: {
    "color.surface2": ["--surface-2"],
    none: [],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [],
} as const

export type SeparatorSlot = (typeof SEPARATOR.slots)[number]
export type SeparatorState = (typeof SEPARATOR.states)[number]
export type SeparatorOrientation =
  (typeof SEPARATOR.variants.orientation.values)[number]
