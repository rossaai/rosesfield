// Generated. Do not edit.

export const SLIDER = {
  id: "slider",
  name: "Slider",
  slots: [],
  variants: {
    held: {
      values: ["no", "both", "toEnd", "toStart"],
      default: "no",
    },
  },
  states: ["rest", "held", "dragging", "focusVisible", "disabled", "waveform"],
  sizes: {
    track: {
      phone: "control.track",
      tablet: "control.track",
      desktop: "control.track",
    },
    hitBand: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
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
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    heldGrowth: {
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
  material: {
    material: "none",
    ground: "color.surface2",
  },
  motion: [
    {
      part: "knob",
      preset: "disclosure",
      motion: "none",
    },
  ],
} as const

export type SliderSlot = (typeof SLIDER.slots)[number]
export type SliderState = (typeof SLIDER.states)[number]
export type SliderHeld = (typeof SLIDER.variants.held.values)[number]
