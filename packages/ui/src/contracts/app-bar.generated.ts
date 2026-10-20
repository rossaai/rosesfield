// Generated. Do not edit.

export const APP_BAR = {
  id: "app-bar",
  name: "AppBar",
  slots: ["mark", "areas", "areaMenu", "balance", "connect", "tabs"],
  variants: {
    place: {
      values: ["top", "bottom"],
      default: "top",
    },
    density: {
      values: ["full", "compact"],
      default: "full",
    },
  },
  states: [
    "rest",
    "scrolled",
    "areaOpen",
    "current",
    "connected",
    "notConnected",
    "overflow",
  ],
  sizes: {
    height: {
      phone: "component.header.height",
      tablet: "component.header.height",
      desktop: "component.header.height",
    },
    compactHeight: {
      phone: "control.hitRail",
      tablet: "control.hitRail",
      desktop: "control.hitRail",
    },
    mark: {
      phone: "mark.default",
      tablet: "mark.default",
      desktop: "mark.default",
    },
    linkHeight: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    linkSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    linkLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    linkRadius: {
      phone: "radius.r2",
      tablet: "radius.r2",
      desktop: "radius.r2",
    },
    actionHeight: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    actionRadius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    menuRowIcon: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    menuRowLine: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    tabHeight: {
      phone: "component.header.height",
      tablet: "component.header.height",
      desktop: "component.header.height",
    },
    tabGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    tabLabel: {
      phone: "type.captionSize",
      tablet: "type.captionSize",
      desktop: "type.captionSize",
    },
    tabGenerate: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
  },
  variables: {
    "component.header.height": ["--spacing-header"],
    "control.btn": ["--spacing-field"],
    "control.hitRail": ["--spacing-tab"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "icon.uiSize": ["--spacing-glyph"],
    "mark.default": [],
    "radius.full": ["--radius-full"],
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
    "type.captionSize": [
      "--text-caption",
      "--text-caption--line-height",
      "--text-caption--letter-spacing",
    ],
    "type.subheadSize": [
      "--text-label",
      "--text-label--line-height",
      "--text-label--letter-spacing",
    ],
  },
  material: {
    material: "material.regular",
    ground: "color.canvas",
  },
  motion: [
    {
      part: "areaMenu",
      preset: "popover",
      motion: "none",
    },
    {
      part: "link",
      preset: "tint",
      motion: "none",
    },
    {
      part: "density",
      preset: "yield",
      motion: "none",
    },
    {
      part: "tabGenerate",
      preset: "press",
      motion: "press",
    },
  ],
} as const

export type AppBarSlot = (typeof APP_BAR.slots)[number]
export type AppBarState = (typeof APP_BAR.states)[number]
export type AppBarPlace = (typeof APP_BAR.variants.place.values)[number]
export type AppBarDensity = (typeof APP_BAR.variants.density.values)[number]
