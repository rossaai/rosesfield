// Generated. Do not edit.

export const ICON_BUTTON = {
  id: "icon-button",
  name: "IconButton",
  slots: ["glyph", "tip"],
  variants: {
    tone: {
      values: ["surface", "canvas", "quiet", "accent", "glass"],
      default: "surface",
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
    "on",
    "turned",
  ],
  sizes: {
    circle: {
      phone: {
        chrome: "control.hitTouch",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
      tablet: {
        chrome: "control.hitTouch",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
      desktop: {
        chrome: "control.hitTouch",
        composer: "control.hitDense",
        row: "control.hitRailDense",
      },
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
    hitFloor: {
      phone: "control.hitFloor",
      tablet: "control.hitFloor",
      desktop: "control.hitFloor",
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
    "control.hitDense": ["--spacing-button-dense", "--spacing-icon-dense"],
    "control.hitFloor": [],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "icon.smSize": ["--spacing-glyph-small"],
    "icon.uiSize": ["--spacing-glyph"],
    "radius.full": ["--radius-full"],
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
    {
      part: "turn",
      preset: "disclosure",
      motion: "none",
    },
  ],
} as const

export type IconButtonSlot = (typeof ICON_BUTTON.slots)[number]
export type IconButtonState = (typeof ICON_BUTTON.states)[number]
export type IconButtonTone = (typeof ICON_BUTTON.variants.tone.values)[number]
export type IconButtonDensity =
  (typeof ICON_BUTTON.variants.density.values)[number]
export type IconButtonGround =
  (typeof ICON_BUTTON.variants.ground.values)[number]
