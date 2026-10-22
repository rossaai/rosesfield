// Generated. Do not edit.

export const MODAL = {
  id: "modal",
  name: "Modal",
  slots: ["head", "description", "body", "words", "actions", "nav"],
  variants: {
    form: {
      values: ["panel", "split", "palette", "wide"],
      default: "panel",
    },
    idiom: {
      values: ["dialog", "sheet"],
      default: "dialog",
    },
  },
  states: ["closed", "opening", "open", "scrolled", "closing", "dirty"],
  sizes: {
    panelWidth: {
      phone: "component.sheet.panelMaxW",
      tablet: "component.sheet.panelMaxW",
      desktop: "component.sheet.panelMaxW",
    },
    splitWidth: {
      phone: "component.settings.modalW",
      tablet: "component.settings.modalW",
      desktop: "component.settings.modalW",
    },
    wideWidth: {
      phone: "component.sheet.wideMaxW",
      tablet: "component.sheet.wideMaxW",
      desktop: "component.sheet.wideMaxW",
    },
    splitHeight: {
      phone: "component.settings.modalH",
      tablet: "component.settings.modalH",
      desktop: "component.settings.modalH",
    },
    navWidth: {
      phone: "component.settings.rail.width",
      tablet: "component.settings.rail.width",
      desktop: "component.settings.rail.width",
    },
    frameMargin: {
      phone: "space.s12",
      tablet: "space.s12",
      desktop: "space.s12",
    },
    footGap: {
      phone: "space.s5",
      tablet: "space.s5",
      desktop: "space.s5",
    },
    closeCircle: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    descriptionSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    titleSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    paletteInset: {
      phone: "space.s2_5",
      tablet: "space.s2_5",
      desktop: "space.s2_5",
    },
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
    wordsInset: {
      phone: "space.s5",
      tablet: "space.s5",
      desktop: "space.s5",
    },
    titleInset: {
      phone: "space.s5",
      tablet: "space.s5",
      desktop: "space.s5",
    },
    contentWidth: {
      phone: "component.sheet.panelMaxW",
      tablet: "component.sheet.panelMaxW",
      desktop: "component.sheet.panelMaxW",
    },
    scrim: {
      phone: "dim.scrimModal",
      tablet: "dim.scrimModal",
      desktop: "dim.scrimModal",
    },
  },
  variables: {
    "component.settings.modalH": ["--spacing-settings-modal-h"],
    "component.settings.modalW": ["--spacing-settings-modal-w"],
    "component.settings.rail.width": ["--spacing-settings-rail"],
    "component.sheet.panelMaxW": ["--spacing-dialog"],
    "component.sheet.wideMaxW": [],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "dim.scrimModal": ["--scrim"],
    "radius.r8": ["--radius-vessel"],
    "space.s12": ["--spacing-s12"],
    "space.s2_5": ["--spacing-s2_5"],
    "space.s5": ["--spacing-s5"],
    "type.bodySize": [
      "--text-body",
      "--text-body--line-height",
      "--text-body--letter-spacing",
      "--text-code",
      "--text-code--line-height",
      "--text-code--letter-spacing",
    ],
  },
  material: {
    material: "none",
    ground: "color.layer",
  },
  motion: [
    {
      part: "panel",
      preset: "layer",
      motion: "none",
    },
    {
      part: "scrim",
      preset: "scrim",
      motion: "none",
    },
  ],
} as const

export type ModalSlot = (typeof MODAL.slots)[number]
export type ModalState = (typeof MODAL.states)[number]
export type ModalForm = (typeof MODAL.variants.form.values)[number]
export type ModalIdiom = (typeof MODAL.variants.idiom.values)[number]
