// Generated. Do not edit.

export const COMMAND = {
  id: "command",
  name: "Command",
  slots: ["input", "list", "empty"],
  variants: {},
  states: ["empty", "narrowed", "noMatch", "highlighted", "disabled"],
  sizes: {
    inputInset: {
      phone: "space.s4",
      tablet: "space.s4",
      desktop: "space.s4",
    },
    gap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "space.s2": ["--spacing-s2"],
    "space.s4": ["--spacing-s4"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [],
} as const

export type CommandSlot = (typeof COMMAND.slots)[number]
export type CommandState = (typeof COMMAND.states)[number]
