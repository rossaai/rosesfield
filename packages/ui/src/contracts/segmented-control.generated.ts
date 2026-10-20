// Generated. Do not edit.

export const SEGMENTED_CONTROL = {
  id: "segmented-control",
  name: "SegmentedControl",
  slots: ["track", "thumb", "cells"],
  variants: {
    density: {
      values: ["chrome", "composer", "row"],
      default: "chrome",
    },
  },
  states: [
    "chosen",
    "unchosen",
    "pressed",
    "focusVisible",
    "disabled",
    "disabledCell",
    "truncated",
  ],
  sizes: {
    track: {
      phone: {
        chrome: "control.btn",
        composer: "control.hitRailDense",
        row: "control.hitRailDense",
      },
      tablet: {
        chrome: "control.btn",
        composer: "control.hitRailDense",
        row: "control.hitRailDense",
      },
      desktop: {
        chrome: "control.btn",
        composer: "control.hitRailDense",
        row: "control.hitRailDense",
      },
    },
    cellInset: {
      phone: "space.s2_5",
      tablet: "space.s2_5",
      desktop: "space.s2_5",
    },
    glyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    glyphGap: {
      phone: "space.s1_5",
      tablet: "space.s1_5",
      desktop: "space.s1_5",
    },
    labelSize: {
      phone: "type.legalSize",
      tablet: "type.legalSize",
      desktop: "type.legalSize",
    },
    labelLine: {
      phone: "type.legalLine",
      tablet: "type.legalLine",
      desktop: "type.legalLine",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "control.btn": ["--spacing-field"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "icon.smSize": ["--spacing-glyph-small"],
    "radius.full": ["--radius-full"],
    "space.s1_5": ["--spacing-s1_5"],
    "space.s2_5": ["--spacing-s2_5"],
    "type.legalLine": ["--text-legal--line-height"],
    "type.legalSize": ["--text-legal"],
  },
  material: {
    material: "none",
    ground: "color.track",
  },
  motion: [
    {
      part: "thumb",
      preset: "travel",
      motion: "none",
    },
    {
      part: "cellTint",
      preset: "tint",
      motion: "none",
    },
  ],
} as const

export type SegmentedControlSlot = (typeof SEGMENTED_CONTROL.slots)[number]
export type SegmentedControlState = (typeof SEGMENTED_CONTROL.states)[number]
export type SegmentedControlDensity =
  (typeof SEGMENTED_CONTROL.variants.density.values)[number]
