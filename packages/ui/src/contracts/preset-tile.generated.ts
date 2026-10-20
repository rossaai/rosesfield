// Generated. Do not edit.

export const PRESET_TILE = {
  id: "preset-tile",
  name: "PresetTile",
  slots: ["clip", "name", "line", "action"],
  variants: {
    form: {
      values: ["clip", "app"],
      default: "clip",
    },
  },
  states: ["rest", "hover", "focusVisible", "playing", "waiting", "failed"],
  sizes: {
    width: {
      phone: "component.mediaGrid.tileWide",
      tablet: "component.presetTile.width",
      desktop: "component.presetTile.width",
    },
    radius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
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
    actionHeight: {
      phone: "control.hitDense",
      tablet: "control.hitDense",
      desktop: "control.hitDense",
    },
    actionGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    gap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
  },
  variables: {
    "component.mediaGrid.tileWide": [],
    "component.presetTile.width": [],
    "control.hitDense": ["--spacing-button-dense", "--spacing-icon-dense"],
    "icon.uiSize": ["--spacing-glyph"],
    "radius.r4": ["--radius-cell"],
    "space.s2": ["--spacing-s2"],
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
    material: "none",
    ground: "color.surface",
  },
  motion: [
    {
      part: "reveal",
      preset: "tint",
      motion: "none",
    },
    {
      part: "press",
      preset: "press",
      motion: "press",
    },
  ],
} as const

export type PresetTileSlot = (typeof PRESET_TILE.slots)[number]
export type PresetTileState = (typeof PRESET_TILE.states)[number]
export type PresetTileForm = (typeof PRESET_TILE.variants.form.values)[number]
