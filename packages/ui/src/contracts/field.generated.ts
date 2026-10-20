// Generated. Do not edit.

export const FIELD = {
  id: "field",
  name: "Field",
  slots: ["caption", "lead", "input", "clear", "act", "message"],
  variants: {
    ground: {
      values: ["canvas", "surface", "surface2", "layer", "layerWell"],
      default: "layer",
    },
    lines: {
      values: ["one", "many"],
      default: "one",
    },
    grow: {
      values: ["fixed", "words"],
      default: "fixed",
    },
    keyboard: {
      values: ["text", "number"],
      default: "text",
    },
    message: {
      values: ["none", "note", "fault"],
      default: "none",
    },
    measure: {
      values: ["field", "column"],
      default: "field",
    },
    caption: {
      values: ["shown", "spoken"],
      default: "shown",
    },
  },
  states: [
    "empty",
    "focused",
    "typing",
    "filled",
    "readOnly",
    "disabled",
    "fault",
    "waiting",
    "truncated",
    "grown",
    "longestMessage",
    "act",
  ],
  sizes: {
    wellHeight: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    radiusIsHalfOf: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    manyLinePadding: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    growLines: {
      phone: "component.composer.promptLines",
      tablet: "component.composer.promptLines",
      desktop: "component.composer.promptLines",
    },
    measure: {
      phone: "component.field.maxWidth",
      tablet: "component.field.maxWidth",
      desktop: "component.field.maxWidth",
    },
    textSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    textLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    captionSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    captionLine: {
      phone: "type.subheadLine",
      tablet: "type.subheadLine",
      desktop: "type.subheadLine",
    },
    messageSize: {
      phone: "type.subheadSize",
      tablet: "type.subheadSize",
      desktop: "type.subheadSize",
    },
    messageLine: {
      phone: "type.subheadLine",
      tablet: "type.subheadLine",
      desktop: "type.subheadLine",
    },
    leadBox: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    leadGlyph: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    clearCircle: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    clearSeat: {
      phone: "control.wellInset",
      tablet: "control.wellInset",
      desktop: "control.wellInset",
    },
    messageGlyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    messageGap: {
      phone: "space.s1_5",
      tablet: "space.s1_5",
      desktop: "space.s1_5",
    },
    hungGlyphGap: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    disabledAlpha: {
      phone: "alpha.disabled",
      tablet: "alpha.disabled",
      desktop: "alpha.disabled",
    },
  },
  variables: {
    "alpha.disabled": ["--opacity-disabled"],
    "component.composer.promptLines": [],
    "component.field.maxWidth": ["--spacing-info-panel", "--spacing-field-max"],
    "control.btn": ["--spacing-field"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "control.wellInset": ["--spacing-control-inset"],
    "icon.smSize": ["--spacing-glyph-small"],
    "icon.uiSize": ["--spacing-glyph"],
    "space.s1": ["--spacing-s1"],
    "space.s1_5": ["--spacing-s1_5"],
    "space.s3": ["--spacing-s3"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.bodySize": ["--text-body", "--text-code"],
    "type.subheadLine": ["--text-label--line-height"],
    "type.subheadSize": ["--text-label"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "clear",
      preset: "swap",
      motion: "none",
    },
  ],
} as const

export type FieldSlot = (typeof FIELD.slots)[number]
export type FieldState = (typeof FIELD.states)[number]
export type FieldGround = (typeof FIELD.variants.ground.values)[number]
export type FieldLines = (typeof FIELD.variants.lines.values)[number]
export type FieldGrow = (typeof FIELD.variants.grow.values)[number]
export type FieldKeyboard = (typeof FIELD.variants.keyboard.values)[number]
export type FieldMessage = (typeof FIELD.variants.message.values)[number]
export type FieldMeasure = (typeof FIELD.variants.measure.values)[number]
export type FieldCaption = (typeof FIELD.variants.caption.values)[number]
