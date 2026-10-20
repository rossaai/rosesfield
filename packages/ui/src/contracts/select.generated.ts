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
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "component.button.maxWidth": ["--spacing-button-max"],
    "component.popover.maxWidth": ["--spacing-popover-max"],
    "component.popover.minWidth": ["--spacing-popover-min"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "icon.smSize": ["--spacing-glyph-small"],
    "radius.full": ["--radius-full"],
    "space.s2": ["--spacing-s2"],
    "space.s2_5": ["--spacing-s2_5"],
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
