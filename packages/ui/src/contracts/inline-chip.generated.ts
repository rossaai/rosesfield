// Generated. Do not edit.

export const INLINE_CHIP = {
  id: "inline-chip",
  name: "InlineChip",
  slots: ["lead", "words"],
  variants: {
    kind: {
      values: ["link", "citation", "mention", "skill", "code", "file"],
      default: "link",
    },
    ground: {
      values: ["tint", "well", "wellOnWell", "wellOnLayer", "none"],
      default: "tint",
    },
    phase: {
      values: ["rest", "waiting", "fault"],
      default: "rest",
    },
    seat: {
      values: ["words", "line"],
      default: "words",
    },
  },
  states: ["rest", "focusVisible", "waiting", "fault"],
  sizes: {
    words: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    line: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    glyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    inset: {
      phone: "space.s1_5",
      tablet: "space.s1_5",
      desktop: "space.s1_5",
    },
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [],
} as const

export type InlineChipSlot = (typeof INLINE_CHIP.slots)[number]
export type InlineChipState = (typeof INLINE_CHIP.states)[number]
export type InlineChipKind = (typeof INLINE_CHIP.variants.kind.values)[number]
export type InlineChipGround =
  (typeof INLINE_CHIP.variants.ground.values)[number]
export type InlineChipPhase = (typeof INLINE_CHIP.variants.phase.values)[number]
export type InlineChipSeat = (typeof INLINE_CHIP.variants.seat.values)[number]
