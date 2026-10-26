// Generated. Do not edit.

export const MODEL_ROW = {
  id: "model-row",
  name: "ModelRow",
  slots: [
    "mark",
    "rank",
    "name",
    "line",
    "badges",
    "weights",
    "capabilities",
    "price",
    "check",
  ],
  variants: {
    place: {
      values: ["list", "trigger"],
      default: "list",
    },
  },
  states: ["rest", "hover", "focusVisible", "chosen", "disabled"],
  sizes: {
    height: {
      phone: "component.modelRow.height",
      tablet: "component.modelRow.height",
      desktop: "component.modelRow.height",
    },
    listWidth: {
      phone: "component.modelList.width",
      tablet: "component.modelList.width",
      desktop: "component.modelList.width",
    },
    tile: {
      phone: "control.hitDense",
      tablet: "control.hitDense",
      desktop: "control.hitDense",
    },
    tileRadius: {
      phone: "radius.r2",
      tablet: "radius.r2",
      desktop: "radius.r2",
    },
    mark: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    radius: {
      phone: "radius.lineTouch",
      tablet: "radius.lineTouch",
      desktop: "radius.lineTouch",
    },
    nameSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    nameLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    lineSize: {
      phone: "type.captionSize",
      tablet: "type.captionSize",
      desktop: "type.captionSize",
    },
    lineLine: {
      phone: "type.captionLine",
      tablet: "type.captionLine",
      desktop: "type.captionLine",
    },
    badgeHeight: {
      phone: "type.captionLine",
      tablet: "type.captionLine",
      desktop: "type.captionLine",
    },
    capabilitySize: {
      phone: "type.captionSize",
      tablet: "type.captionSize",
      desktop: "type.captionSize",
    },
    priceSize: {
      phone: "type.captionSize",
      tablet: "type.captionSize",
      desktop: "type.captionSize",
    },
    weightsMark: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    triggerHeight: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
  },
  variables: {
    "component.modelList.width": [],
    "component.modelRow.height": [],
    "control.hitDense": ["--spacing-button-dense", "--spacing-icon-dense"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "icon.smSize": ["--spacing-glyph-small"],
    "radius.lineTouch": ["--radius-item"],
    "radius.r2": ["--radius-dense"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.bodySize": [
      "--text-body",
      "--text-body--line-height",
      "--text-body--letter-spacing",
      "--text-code",
      "--text-code--line-height",
      "--text-code--letter-spacing",
    ],
    "type.captionLine": ["--text-caption--line-height"],
    "type.captionSize": [
      "--text-caption",
      "--text-caption--line-height",
      "--text-caption--letter-spacing",
    ],
  },
  material: {
    material: "material.regular",
    ground: "color.layer",
  },
  motion: [
    {
      part: "tint",
      preset: "tint",
      motion: "none",
    },
    {
      part: "check",
      preset: "swap",
      motion: "none",
    },
  ],
} as const

export type ModelRowSlot = (typeof MODEL_ROW.slots)[number]
export type ModelRowState = (typeof MODEL_ROW.states)[number]
export type ModelRowPlace = (typeof MODEL_ROW.variants.place.values)[number]
