// Generated. Do not edit.

export const BUTTON = {
  id: "button",
  name: "Button",
  slots: ["glyph", "label"],
  variants: {
    tone: {
      values: ["surface", "quiet", "muted", "accent", "danger", "canvas"],
      default: "surface",
    },
    width: {
      values: ["content", "full"],
      default: "content",
    },
    density: {
      values: ["chrome", "composer", "row"],
      default: "chrome",
    },
    ground: {
      values: ["canvas", "surface", "surface2", "layer", "layerWell"],
      default: "canvas",
    },
  },
  states: [
    "rest",
    "hover",
    "pressed",
    "focusVisible",
    "disabled",
    "pending",
    "truncated",
  ],
  sizes: {
    height: {
      phone: {
        chrome: "control.btn",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
      tablet: {
        chrome: "control.btn",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
      desktop: {
        chrome: "control.btn",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
    },
    maxWidth: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    glyph: {
      phone: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
      tablet: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
      desktop: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
    },
    labelSize: {
      phone: {
        chrome: "type.bodySize",
        composer: "type.bodySize",
        row: "type.subheadSize",
      },
      tablet: {
        chrome: "type.bodySize",
        composer: "type.bodySize",
        row: "type.subheadSize",
      },
      desktop: {
        chrome: "type.bodySize",
        composer: "type.bodySize",
        row: "type.subheadSize",
      },
    },
    labelLine: {
      phone: {
        chrome: "type.bodyLine",
        composer: "type.bodyLine",
        row: "type.subheadLine",
      },
      tablet: {
        chrome: "type.bodyLine",
        composer: "type.bodyLine",
        row: "type.subheadLine",
      },
      desktop: {
        chrome: "type.bodyLine",
        composer: "type.bodyLine",
        row: "type.subheadLine",
      },
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
      part: "glyph",
      preset: "swap",
      motion: "none",
    },
  ],
} as const

export type ButtonSlot = (typeof BUTTON.slots)[number]
export type ButtonState = (typeof BUTTON.states)[number]
export type ButtonTone = (typeof BUTTON.variants.tone.values)[number]
export type ButtonWidth = (typeof BUTTON.variants.width.values)[number]
export type ButtonDensity = (typeof BUTTON.variants.density.values)[number]
export type ButtonGround = (typeof BUTTON.variants.ground.values)[number]
