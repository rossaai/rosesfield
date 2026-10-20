// Generated. Do not edit.

export const SWITCH = {
  id: "switch",
  name: "Switch",
  slots: [],
  variants: {
    held: {
      values: ["no", "toEnd", "toStart"],
      default: "no",
    },
  },
  states: ["off", "on", "pressed", "focusVisible", "disabled"],
  sizes: {
    trackWidth: {
      phone: "control.switchTrack.width",
      tablet: "control.switchTrack.width",
      desktop: "control.switchTrack.width",
    },
    knobWidth: {
      phone: "control.knob.width",
      tablet: "control.knob.width",
      desktop: "control.knob.width",
    },
    knobHeight: {
      phone: "control.knob.height",
      tablet: "control.knob.height",
      desktop: "control.knob.height",
    },
    pressedGrowth: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    hitFloor: {
      phone: "control.hitFloor",
      tablet: "control.hitFloor",
      desktop: "control.hitFloor",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "control.hitFloor": [],
    "control.knob.height": ["--spacing-switch-height", "--spacing-knob-height"],
    "control.knob.width": ["--spacing-knob-width"],
    "control.switchTrack.width": ["--spacing-switch-width"],
    "space.s2": ["--spacing-s2"],
  },
  material: {
    material: "none",
    ground: "color.track",
  },
  motion: [
    {
      part: "knob",
      preset: "disclosure",
      motion: "none",
    },
    {
      part: "track",
      preset: "tint",
      motion: "none",
    },
  ],
} as const

export type SwitchSlot = (typeof SWITCH.slots)[number]
export type SwitchState = (typeof SWITCH.states)[number]
export type SwitchHeld = (typeof SWITCH.variants.held.values)[number]
