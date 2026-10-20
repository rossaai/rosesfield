// Generated. Do not edit.

export const SECTION_HEADING = {
  id: "section-heading",
  name: "SectionHeading",
  slots: ["lead", "label", "actions", "menu", "chevron"],
  variants: {
    reveal: {
      values: ["hover", "always"],
      default: "hover",
    },
    rhythm: {
      values: ["rail", "row"],
      default: "rail",
    },
    words: {
      values: ["label", "row"],
      default: "label",
    },
    line: {
      values: ["glyph", "words"],
      default: "glyph",
    },
  },
  states: [
    "rest",
    "hover",
    "focusVisible",
    "collapsed",
    "expanded",
    "dropTarget",
  ],
  sizes: {
    height: {
      phone: "control.hitRail",
      tablet: "control.hitRail",
      desktop: "control.hitRail",
    },
    leadGlyph: {
      phone: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
      tablet: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
      desktop: {
        chrome: "icon.uiSize",
        composer: "icon.uiSize",
        row: "icon.smSize",
      },
    },
    leadGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    chevronGap: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    actionCircle: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
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
    rowWordsSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    rowWordsLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    radiusLine: {
      phone: "control.hitRail",
      tablet: "control.hitRail",
      desktop: "control.hitRail",
    },
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "actions",
      preset: "swap",
      motion: "fadeToggle",
    },
  ],
} as const

export type SectionHeadingSlot = (typeof SECTION_HEADING.slots)[number]
export type SectionHeadingState = (typeof SECTION_HEADING.states)[number]
export type SectionHeadingReveal =
  (typeof SECTION_HEADING.variants.reveal.values)[number]
export type SectionHeadingRhythm =
  (typeof SECTION_HEADING.variants.rhythm.values)[number]
export type SectionHeadingWords =
  (typeof SECTION_HEADING.variants.words.values)[number]
export type SectionHeadingLine =
  (typeof SECTION_HEADING.variants.line.values)[number]
