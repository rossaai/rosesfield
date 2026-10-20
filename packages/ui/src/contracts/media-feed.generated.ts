// Generated. Do not edit.

export const MEDIA_FEED = {
  id: "media-feed",
  name: "MediaFeed",
  slots: ["header", "items", "viewAll"],
  variants: {
    layout: {
      values: ["masonry", "row"],
      default: "masonry",
    },
  },
  states: [
    "rest",
    "waiting",
    "empty",
    "playing",
    "paused",
    "clipped",
    "reducedMotion",
  ],
  sizes: {
    gap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    tileRadius: {
      phone: "radius.r4",
      tablet: "radius.r4",
      desktop: "radius.r4",
    },
    window: {
      phone: "component.feed.window",
      tablet: "component.feed.window",
      desktop: "component.feed.window",
    },
    fade: {
      phone: "component.feed.fade",
      tablet: "component.feed.fade",
      desktop: "component.feed.fade",
    },
    viewAllHeight: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    viewAllGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    rowCircle: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    rowCard: {
      phone: "component.mediaGrid.tileVertical",
      tablet: "component.mediaGrid.tileVertical",
      desktop: "component.mediaGrid.tileVertical",
    },
    titleSize: {
      phone: "type.titleSize",
      tablet: "type.titleSize",
      desktop: "type.titleSize",
    },
    lineSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
  },
  variables: {
    "component.feed.fade": [],
    "component.feed.window": [],
    "component.mediaGrid.tileVertical": [],
    "control.btn": ["--spacing-field"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "icon.uiSize": ["--spacing-glyph"],
    "radius.r4": ["--radius-cell"],
    "space.s2": ["--spacing-s2"],
    "type.subheadSize": [
      "--text-label",
      "--text-label--line-height",
      "--text-label--letter-spacing",
    ],
    "type.titleSize": [
      "--text-title",
      "--text-title--line-height",
      "--text-title--letter-spacing",
    ],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "tileArrive",
      preset: "enter",
      motion: "none",
    },
    {
      part: "rowTravel",
      preset: "travel",
      motion: "none",
    },
  ],
} as const

export type MediaFeedSlot = (typeof MEDIA_FEED.slots)[number]
export type MediaFeedState = (typeof MEDIA_FEED.states)[number]
export type MediaFeedLayout = (typeof MEDIA_FEED.variants.layout.values)[number]
