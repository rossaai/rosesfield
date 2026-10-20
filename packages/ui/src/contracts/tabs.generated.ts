// Generated. Do not edit.

export const TABS = {
  id: "tabs",
  name: "Tabs",
  slots: ["strip", "lead", "title", "close", "trail", "panel", "menu"],
  variants: {
    ground: {
      values: ["canvas", "surface", "surface2", "layer", "layerWell"],
      default: "surface",
    },
    tint: {
      values: ["idle", "hovered", "selected"],
      default: "idle",
    },
    closable: {
      values: ["no", "yes"],
      default: "no",
    },
  },
  states: [
    "rest",
    "hover",
    "selected",
    "focusVisible",
    "truncated",
    "scrolled",
    "dragging",
    "held",
  ],
  sizes: {
    tabHeight: {
      phone: "control.hitRail",
      tablet: "control.hitRail",
      desktop: "control.hitRail",
    },
    tabMaxWidth: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    tabRadius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    leadBox: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    closeCircle: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    endWithoutClose: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    titleSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    titleLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    stripInsetX: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    faviconBox: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    stripInsetY: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    stripGap: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    stripFade: {
      phone: "space.s8",
      tablet: "space.s8",
      desktop: "space.s8",
    },
  },
  variables: {
    "component.button.maxWidth": ["--spacing-button-max"],
    "control.hitRail": ["--spacing-tab"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "icon.smSize": ["--spacing-glyph-small"],
    "radius.full": ["--radius-full"],
    "space.s1": ["--spacing-s1"],
    "space.s3": ["--spacing-s3"],
    "space.s8": ["--spacing-s8"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.bodySize": ["--text-body", "--text-code"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "tab",
      preset: "tint",
      motion: "none",
    },
    {
      part: "arrival",
      preset: "yield",
      motion: "none",
    },
    {
      part: "move",
      preset: "travel",
      motion: "none",
    },
  ],
} as const

export type TabsSlot = (typeof TABS.slots)[number]
export type TabsState = (typeof TABS.states)[number]
export type TabsGround = (typeof TABS.variants.ground.values)[number]
export type TabsTint = (typeof TABS.variants.tint.values)[number]
export type TabsClosable = (typeof TABS.variants.closable.values)[number]
