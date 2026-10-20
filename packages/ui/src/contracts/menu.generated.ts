// Generated. Do not edit.

export const MENU = {
  id: "menu",
  name: "DropdownMenu",
  slots: ["trigger", "items", "separator", "header"],
  variants: {
    side: {
      values: ["bottom", "top"],
      default: "bottom",
    },
    align: {
      values: ["start", "end"],
      default: "start",
    },
    anchor: {
      values: ["trigger", "edge"],
      default: "trigger",
    },
  },
  states: [
    "closed",
    "open",
    "trailingEdge",
    "openAbove",
    "choices",
    "captions",
    "unavailable",
    "shortcutKeys",
    "longestItem",
    "submenuOpen",
    "longestValue",
    "scrolled",
  ],
  sizes: {
    minWidth: {
      phone: "component.popover.minWidth",
      tablet: "component.popover.minWidth",
      desktop: "component.popover.minWidth",
    },
    maxWidth: {
      phone: "component.popover.maxWidth",
      tablet: "component.popover.maxWidth",
      desktop: "component.popover.maxWidth",
    },
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
    offset: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    windowInset: {
      phone: "space.s4",
      tablet: "space.s4",
      desktop: "space.s4",
    },
    leadSeat: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    checkGlyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    keysGlyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    valueGap: {
      phone: "space.s1_5",
      tablet: "space.s1_5",
      desktop: "space.s1_5",
    },
  },
  material: {
    material: "material.regular",
    ground: "color.layer",
  },
  motion: [
    {
      part: "open",
      preset: "popover",
      motion: "none",
    },
    {
      part: "close",
      preset: "popover",
      motion: "none",
    },
    {
      part: "tint",
      preset: "tint",
      motion: "none",
    },
    {
      part: "submenuInPlace",
      preset: "yield",
      motion: "none",
    },
  ],
} as const

export type DropdownMenuSlot = (typeof MENU.slots)[number]
export type DropdownMenuState = (typeof MENU.states)[number]
export type DropdownMenuSide = (typeof MENU.variants.side.values)[number]
export type DropdownMenuAlign = (typeof MENU.variants.align.values)[number]
export type DropdownMenuAnchor = (typeof MENU.variants.anchor.values)[number]
