// Generated. Do not edit.

export const SKELETON = {
  id: "skeleton",
  name: "Skeleton",
  slots: ["shape"],
  variants: {
    text: {
      values: ["display", "title", "body", "label", "caption", "legal"],
      default: "body",
    },
    measure: {
      values: [
        "full",
        "long",
        "mid",
        "short",
        "tail",
        "sentence",
        "phrase",
        "word",
      ],
      default: "mid",
    },
    size: {
      values: [
        "mark",
        "glyphSm",
        "glyph",
        "rail",
        "dense",
        "touch",
        "value",
        "chip",
        "control",
        "switch",
      ],
      default: "glyph",
    },
    corner: {
      values: ["tile", "flush"],
      default: "tile",
    },
    ground: {
      values: ["canvas", "surface", "surface2", "layer", "layerWell"],
      default: "canvas",
    },
  },
  states: ["waiting", "arrived"],
  sizes: {
    displayLine: {
      phone: "type.displayLine",
      tablet: "type.displayLine",
      desktop: "type.displayLine",
    },
    titleLine: {
      phone: "type.titleLine",
      tablet: "type.titleLine",
      desktop: "type.titleLine",
    },
    bodyLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    captionLine: {
      phone: "type.captionLine",
      tablet: "type.captionLine",
      desktop: "type.captionLine",
    },
    legalLine: {
      phone: "type.legalLine",
      tablet: "type.legalLine",
      desktop: "type.legalLine",
    },
    lineInset: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    rowGap: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    markCircle: {
      phone: "type.captionSize",
      tablet: "type.captionSize",
      desktop: "type.captionSize",
    },
    glyphCircle: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    touchCircle: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    valueChip: {
      phone: "type.captionLine",
      tablet: "type.captionLine",
      desktop: "type.captionLine",
    },
    switchChipWidth: {
      phone: "control.switchTrack.width",
      tablet: "control.switchTrack.width",
      desktop: "control.switchTrack.width",
    },
    switchChipKnob: {
      phone: "control.knob.height",
      tablet: "control.knob.height",
      desktop: "control.knob.height",
    },
    switchChipInset: {
      phone: "control.switchInset",
      tablet: "control.switchInset",
      desktop: "control.switchInset",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    glyphRadius: {
      phone: "radius.r2",
      tablet: "radius.r2",
      desktop: "radius.r2",
    },
    thumbnailRadius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    thumbnailBasis: {
      phone: "component.mediaGrid.tileWide",
      tablet: "component.mediaGrid.tileWide",
      desktop: "component.mediaGrid.tileWide",
    },
    thumbnailGrowth: {
      phone: "component.mediaGrid.tileMaxScale",
      tablet: "component.mediaGrid.tileMaxScale",
      desktop: "component.mediaGrid.tileMaxScale",
    },
    trackThickness: {
      phone: "control.track",
      tablet: "control.track",
      desktop: "control.track",
    },
    frameRadius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    pulseFloor: {
      phone: "alpha.pulse",
      tablet: "alpha.pulse",
      desktop: "alpha.pulse",
    },
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "pulse",
      preset: "tint",
      motion: "skeleton",
    },
  ],
} as const

export type SkeletonSlot = (typeof SKELETON.slots)[number]
export type SkeletonState = (typeof SKELETON.states)[number]
export type SkeletonText = (typeof SKELETON.variants.text.values)[number]
export type SkeletonMeasure = (typeof SKELETON.variants.measure.values)[number]
export type SkeletonSize = (typeof SKELETON.variants.size.values)[number]
export type SkeletonCorner = (typeof SKELETON.variants.corner.values)[number]
export type SkeletonGround = (typeof SKELETON.variants.ground.values)[number]
