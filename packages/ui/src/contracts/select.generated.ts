// Generated. Do not edit.

export const SELECT = {
  id: "select",
  name: "Select",
  slots: ["value", "chevron", "options"],
  variants: {
    form: {
      values: ["value", "chip"],
      default: "value",
    },
    ground: {
      values: ["canvas", "surface", "layer"],
      default: "canvas",
    },
    tone: {
      values: ["surface", "quiet"],
      default: "surface",
    },
  },
  states: [
    "closed",
    "hover",
    "pressed",
    "open",
    "chosen",
    "focusVisible",
    "disabled",
    "truncated",
  ],
  sizes: {
    valueHeight: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    chipHeight: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    maxWidth: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    check: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    panelOffset: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    panelInset: {
      phone: "space.s2_5",
      tablet: "space.s2_5",
      desktop: "space.s2_5",
    },
    panelMinWidth: {
      phone: "component.popover.minWidth",
      tablet: "component.popover.minWidth",
      desktop: "component.popover.minWidth",
    },
    panelMaxWidth: {
      phone: "component.popover.maxWidth",
      tablet: "component.popover.maxWidth",
      desktop: "component.popover.maxWidth",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  material: {
    material: "material.regular",
    ground: "region",
  },
  motion: [
    {
      part: "panel",
      preset: "popover",
      motion: "none",
    },
    {
      part: "chevron",
      preset: "popover",
      motion: "none",
    },
    {
      part: "press",
      preset: "press",
      motion: "none",
    },
  ],
} as const

export type SelectSlot = (typeof SELECT.slots)[number]
export type SelectState = (typeof SELECT.states)[number]
export type SelectForm = (typeof SELECT.variants.form.values)[number]
export type SelectGround = (typeof SELECT.variants.ground.values)[number]
export type SelectTone = (typeof SELECT.variants.tone.values)[number]
