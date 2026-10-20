// Generated. Do not edit.

export const SHEET = {
  id: "sheet",
  name: "Sheet",
  slots: ["grabber", "head", "body"],
  variants: {
    detent: {
      values: ["content", "tall", "full"],
      default: "content",
    },
    ground: {
      values: ["thick", "opaque"],
      default: "thick",
    },
    edge: {
      values: ["docked", "full"],
      default: "docked",
    },
  },
  states: ["closed", "opening", "open", "dragging", "settling", "closing"],
  sizes: {
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
    maxWidth: {
      phone: "component.sheet.panelMaxW",
      tablet: "component.sheet.panelMaxW",
      desktop: "component.sheet.panelMaxW",
    },
    statusZone: {
      phone: "component.sheet.statusZone",
      tablet: "component.sheet.statusZone",
      desktop: "component.sheet.statusZone",
    },
    grabberWidth: {
      phone: "component.sheet.grabber.width",
      tablet: "component.sheet.grabber.width",
      desktop: "component.sheet.grabber.width",
    },
    grabberHeight: {
      phone: "component.sheet.grabber.height",
      tablet: "component.sheet.grabber.height",
      desktop: "component.sheet.grabber.height",
    },
    bleed: {
      phone: "component.sheet.bleed",
      tablet: "component.sheet.bleed",
      desktop: "component.sheet.bleed",
    },
  },
  variables: {
    "component.sheet.bleed": [],
    "component.sheet.grabber.height": ["--spacing-grabber-height"],
    "component.sheet.grabber.width": ["--spacing-grabber-width"],
    "component.sheet.panelMaxW": ["--spacing-dialog"],
    "component.sheet.statusZone": [],
    "radius.r8": ["--radius-vessel"],
  },
  material: {
    material: "material.thick",
    ground: "color.layer",
  },
  motion: [
    {
      part: "panel",
      preset: "layer",
      motion: "sheetDrag",
    },
    {
      part: "scrim",
      preset: "scrim",
      motion: "sheetDrag",
    },
  ],
} as const

export type SheetSlot = (typeof SHEET.slots)[number]
export type SheetState = (typeof SHEET.states)[number]
export type SheetDetent = (typeof SHEET.variants.detent.values)[number]
export type SheetGround = (typeof SHEET.variants.ground.values)[number]
export type SheetEdge = (typeof SHEET.variants.edge.values)[number]
