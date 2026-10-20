// Generated. Do not edit.

export const COUNT_BADGE = {
  id: "count-badge",
  name: "CountBadge",
  slots: ["words"],
  variants: {},
  states: ["rest", "changing"],
  sizes: {
    height: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    wordsSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    wordsLine: {
      phone: "type.subheadLine",
      tablet: "type.subheadLine",
      desktop: "type.subheadLine",
    },
  },
  variables: {
    "radius.full": ["--radius-full"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.subheadLine": ["--text-label--line-height"],
    "type.subheadSize": [
      "--text-label",
      "--text-label--line-height",
      "--text-label--letter-spacing",
    ],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "words",
      preset: "swap",
      motion: "rise",
    },
  ],
} as const

export type CountBadgeSlot = (typeof COUNT_BADGE.slots)[number]
export type CountBadgeState = (typeof COUNT_BADGE.states)[number]
