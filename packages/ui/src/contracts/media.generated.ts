// Generated. Do not edit.

export const MEDIA = {
  id: "media",
  name: "Media",
  slots: ["image", "veil", "fault"],
  variants: {
    place: {
      values: ["cell", "bubble"],
      default: "cell",
    },
    fit: {
      values: ["cover", "contain"],
      default: "cover",
    },
    frame: {
      values: ["thumb", "tile", "stage"],
      default: "tile",
    },
  },
  states: [
    "waiting",
    "loaded",
    "silent",
    "failed",
    "failedThumb",
    "failedStage",
    "decorative",
    "live",
  ],
  sizes: {
    cellRadius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    bubbleRadius: {
      phone: "radius.r6",
      tablet: "radius.r6",
      desktop: "radius.r6",
    },
    faultGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    faultGlyphThumb: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    gridGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    gridTile: {
      phone: "component.mediaGrid.tileUser",
      tablet: "component.mediaGrid.tileWide",
      desktop: "component.mediaGrid.tileWide",
    },
    gridTileBubble: {
      phone: "component.mediaGrid.tileUser",
      tablet: "component.mediaGrid.tileUser",
      desktop: "component.mediaGrid.tileUser",
    },
    gridTileGrowth: {
      phone: "component.mediaGrid.tileMaxScale",
      tablet: "component.mediaGrid.tileMaxScale",
      desktop: "component.mediaGrid.tileMaxScale",
    },
  },
  material: {
    material: "none",
    ground: "color.surface",
  },
  motion: [
    {
      part: "veil",
      preset: "travel",
      motion: "veilFade",
    },
  ],
} as const

export type MediaSlot = (typeof MEDIA.slots)[number]
export type MediaState = (typeof MEDIA.states)[number]
export type MediaPlace = (typeof MEDIA.variants.place.values)[number]
export type MediaFit = (typeof MEDIA.variants.fit.values)[number]
export type MediaFrame = (typeof MEDIA.variants.frame.values)[number]
