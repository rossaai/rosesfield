// Generated. Do not edit.

export const TOOLTIP = {
  id: "tooltip",
  name: "Tooltip",
  slots: ["trigger", "label", "detail", "keys", "content"],
  variants: {
    form: {
      values: ["words", "content"],
      default: "words",
    },
  },
  states: ["closed", "waiting", "open", "held", "wrapped"],
  sizes: {
    labelSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    labelLine: {
      phone: "type.subheadLine",
      tablet: "type.subheadLine",
      desktop: "type.subheadLine",
    },
    lineHeight: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    radius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    keysGap: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    wrapGap: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
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
    drawerColumn: {
      phone: "component.drawer.width",
      tablet: "component.drawer.width",
      desktop: "component.drawer.width",
    },
    contentMeasure: {
      phone: "component.popover.maxWidth",
      tablet: "component.popover.maxWidth",
      desktop: "component.popover.maxWidth",
    },
    contentInset: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
  },
  variables: {
    "component.drawer.width": ["--spacing-sidebar"],
    "component.popover.maxWidth": ["--spacing-popover-max"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "radius.r4": ["--radius-cell"],
    "space.s1": ["--spacing-s1"],
    "space.s2": ["--spacing-s2"],
    "space.s3": ["--spacing-s3"],
    "space.s4": ["--spacing-s4"],
    "type.subheadLine": ["--text-label--line-height"],
    "type.subheadSize": ["--text-label"],
  },
  material: {
    material: "none",
    ground: "color.layer",
  },
  motion: [
    {
      part: "surface",
      preset: "popover",
      motion: "none",
    },
  ],
} as const

export type TooltipSlot = (typeof TOOLTIP.slots)[number]
export type TooltipState = (typeof TOOLTIP.states)[number]
export type TooltipForm = (typeof TOOLTIP.variants.form.values)[number]
