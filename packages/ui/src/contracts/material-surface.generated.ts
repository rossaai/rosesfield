// Generated. Do not edit.

export const MATERIAL_SURFACE = {
  id: "material-surface",
  name: "MaterialSurface",
  slots: ["content"],
  variants: {
    thickness: {
      values: ["none", "thin", "regular", "thick", "glass"],
      default: "none",
    },
    window: {
      values: ["key", "inactive"],
      default: "key",
    },
  },
  states: [
    "opaque",
    "material",
    "fading",
    "inactiveWindow",
    "reducedTransparency",
  ],
  sizes: {
    blurThin: {
      phone: "material.thin.blur",
      tablet: "material.thin.blur",
      desktop: "material.thin.blur",
    },
    tintThin: {
      phone: "material.thin.tint",
      tablet: "material.thin.tint",
      desktop: "material.thin.tint",
    },
    blurRegular: {
      phone: "material.regular.blur",
      tablet: "material.regular.blur",
      desktop: "material.regular.blur",
    },
    tintRegular: {
      phone: "material.regular.tint",
      tablet: "material.regular.tint",
      desktop: "material.regular.tint",
    },
    blurThick: {
      phone: "material.thick.blur",
      tablet: "material.thick.blur",
      desktop: "material.thick.blur",
    },
    tintThick: {
      phone: "material.thick.tint",
      tablet: "material.thick.tint",
      desktop: "material.thick.tint",
    },
    saturate: {
      phone: "material.regular.saturate",
      tablet: "material.regular.saturate",
      desktop: "material.regular.saturate",
    },
    layer: {
      phone: "color.layer",
      tablet: "color.layer",
      desktop: "color.layer",
    },
    line: {
      phone: "color.layerLine",
      tablet: "color.layerLine",
      desktop: "color.layerLine",
    },
  },
  variables: {
    "color.layer": ["--layer"],
    "color.layerLine": ["--layer-line"],
    "material.regular.blur": [],
    "material.regular.saturate": ["--material-filter"],
    "material.regular.tint": ["--opacity-material"],
    "material.thick.blur": [],
    "material.thick.tint": ["--opacity-material-thick"],
    "material.thin.blur": [],
    "material.thin.tint": ["--opacity-material-thin"],
  },
  material: {
    material: "none",
    ground: "color.layer",
  },
  motion: [],
} as const

export type MaterialSurfaceSlot = (typeof MATERIAL_SURFACE.slots)[number]
export type MaterialSurfaceState = (typeof MATERIAL_SURFACE.states)[number]
export type MaterialSurfaceThickness =
  (typeof MATERIAL_SURFACE.variants.thickness.values)[number]
export type MaterialSurfaceWindow =
  (typeof MATERIAL_SURFACE.variants.window.values)[number]
