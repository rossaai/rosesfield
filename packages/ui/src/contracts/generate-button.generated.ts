// Generated. Do not edit.

export const GENERATE_BUTTON = {
  id: "generate-button",
  name: "GenerateButton",
  slots: ["label", "price"],
  variants: {
    form: {
      values: ["tile", "bar"],
      default: "bar",
    },
  },
  states: [
    "rest",
    "hover",
    "pressed",
    "focusVisible",
    "disabled",
    "busy",
    "pricing",
    "unpriced",
  ],
  sizes: {
    barHeight: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    tileWidth: {
      phone: "component.generate.tileWidth",
      tablet: "component.generate.tileWidth",
      desktop: "component.generate.tileWidth",
    },
    tileHeight: {
      phone: "component.generate.tileHeight",
      tablet: "component.generate.tileHeight",
      desktop: "component.generate.tileHeight",
    },
    labelSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    labelLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    priceSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    priceGlyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    barGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    radius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "component.generate.tileHeight": [],
    "component.generate.tileWidth": [],
    "control.btn": ["--spacing-field"],
    "icon.smSize": ["--spacing-glyph-small"],
    "icon.uiSize": ["--spacing-glyph"],
    "radius.r4": ["--radius-cell"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.bodySize": [
      "--text-body",
      "--text-body--line-height",
      "--text-body--letter-spacing",
      "--text-code",
      "--text-code--line-height",
      "--text-code--letter-spacing",
    ],
    "type.subheadSize": [
      "--text-label",
      "--text-label--line-height",
      "--text-label--letter-spacing",
    ],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "press",
      preset: "press",
      motion: "press",
    },
    {
      part: "price",
      preset: "swap",
      motion: "none",
    },
    {
      part: "busy",
      preset: "swap",
      motion: "none",
    },
  ],
} as const

export type GenerateButtonSlot = (typeof GENERATE_BUTTON.slots)[number]
export type GenerateButtonState = (typeof GENERATE_BUTTON.states)[number]
export type GenerateButtonForm =
  (typeof GENERATE_BUTTON.variants.form.values)[number]
