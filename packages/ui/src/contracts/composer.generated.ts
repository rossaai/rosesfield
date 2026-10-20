// Generated. Do not edit.

export const COMPOSER = {
  id: "composer",
  name: "Composer",
  slots: ["tray", "attachments", "prompt", "notices", "toolbar"],
  variants: {
    mode: {
      values: ["rest", "reply"],
      default: "rest",
    },
  },
  states: [
    "rest",
    "typing",
    "longest",
    "attachments",
    "manyAttachments",
    "chips",
    "recording",
    "hearing",
    "reply",
    "busy",
    "busyWithDraft",
    "contextHigh",
    "editing",
    "locked",
    "returned",
    "tray",
    "mode",
    "whole",
    "still",
  ],
  sizes: {
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
    circle: {
      phone: "control.hitDense",
      tablet: "control.hitDense",
      desktop: "control.hitDense",
    },
    glyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    promptLines: {
      phone: "component.composer.promptLines",
      tablet: "component.composer.promptLines",
      desktop: "component.composer.promptLines",
    },
    promptInset: {
      phone: "component.composer.promptInset",
      tablet: "component.composer.promptInset",
      desktop: "component.composer.promptInset",
    },
    measure: {
      phone: "component.composer.maxWidth",
      tablet: "component.composer.maxWidth",
      desktop: "component.composer.maxWidth",
    },
    trayInset: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    trayTuck: {
      phone: "component.composer.trayTuck",
      tablet: "component.composer.trayTuck",
      desktop: "component.composer.trayTuck",
    },
    modeChip: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    modeChipMaxWidth: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    ring: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    attachmentRow: {
      phone: "component.composer.thumb",
      tablet: "component.composer.thumb",
      desktop: "component.composer.thumb",
    },
    waveformHeight: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
  },
  variables: {
    "component.button.maxWidth": ["--spacing-button-max"],
    "component.composer.maxWidth": ["--spacing-prompt-max"],
    "component.composer.promptInset": [],
    "component.composer.promptLines": [],
    "component.composer.thumb": ["--spacing-thumb"],
    "component.composer.trayTuck": [],
    "control.hitDense": ["--spacing-button-dense", "--spacing-icon-dense"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "icon.uiSize": ["--spacing-glyph"],
    "radius.r8": ["--radius-vessel"],
    "space.s3": ["--spacing-s3"],
  },
  material: {
    material: "none",
    ground: "color.surface",
  },
  motion: [
    {
      part: "ground",
      preset: "tint",
      motion: "none",
    },
    {
      part: "orb",
      preset: "swap",
      motion: "none",
    },
    {
      part: "notice",
      preset: "enter",
      motion: "rise",
    },
    {
      part: "modeChevron",
      preset: "popover",
      motion: "none",
    },
    {
      part: "ringFill",
      preset: "disclosure",
      motion: "meterFill",
    },
    {
      part: "ringHue",
      preset: "tint",
      motion: "none",
    },
    {
      part: "plusTurn",
      preset: "disclosure",
      motion: "none",
    },
    {
      part: "recordingParts",
      preset: "yield",
      motion: "none",
    },
    {
      part: "waveformBar",
      preset: "disclosure",
      motion: "none",
    },
  ],
} as const

export type ComposerSlot = (typeof COMPOSER.slots)[number]
export type ComposerState = (typeof COMPOSER.states)[number]
export type ComposerMode = (typeof COMPOSER.variants.mode.values)[number]
