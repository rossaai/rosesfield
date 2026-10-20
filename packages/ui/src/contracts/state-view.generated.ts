// Generated. Do not edit.

export const STATE_VIEW = {
  id: "state-view",
  name: "StateView",
  slots: ["mark", "lead", "title", "description", "actions"],
  variants: {
    density: {
      values: ["full", "compact"],
      default: "full",
    },
  },
  states: [
    "blank",
    "notFound",
    "error",
    "crash",
    "permission",
    "offline",
    "noResults",
  ],
  sizes: {
    mark: {
      phone: "mark.hero",
      tablet: "mark.hero",
      desktop: "mark.hero",
    },
    markGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    titleSize: {
      phone: "type.titleSize",
      tablet: "type.titleSize",
      desktop: "type.titleSize",
    },
    titleLine: {
      phone: "type.titleLine",
      tablet: "type.titleLine",
      desktop: "type.titleLine",
    },
    descriptionSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    descriptionLine: {
      phone: "type.bodyLine",
      tablet: "type.bodyLine",
      desktop: "type.bodyLine",
    },
    wordsGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    wordsMeasure: {
      phone: "component.marketing.readingMeasure",
      tablet: "component.marketing.readingMeasure",
      desktop: "component.marketing.readingMeasure",
    },
    actionsGap: {
      phone: "space.s4",
      tablet: "space.s4",
      desktop: "space.s4",
    },
    action: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    actionMaxWidth: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    compactGlyph: {
      phone: "icon.smSize",
      tablet: "icon.smSize",
      desktop: "icon.smSize",
    },
    compactGap: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
    compactInset: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    compactTitleSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    compactDescriptionSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
  },
  variables: {
    "component.button.maxWidth": ["--spacing-button-max"],
    "component.marketing.readingMeasure": [],
    "control.btn": ["--spacing-field"],
    "icon.smSize": ["--spacing-glyph-small"],
    "mark.hero": [],
    "space.s2": ["--spacing-s2"],
    "space.s3": ["--spacing-s3"],
    "space.s4": ["--spacing-s4"],
    "type.bodyLine": ["--text-body--line-height", "--text-code--line-height"],
    "type.bodySize": ["--text-body", "--text-code"],
    "type.titleLine": ["--text-title--line-height"],
    "type.titleSize": ["--text-title"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [
    {
      part: "mark",
      preset: "enter",
      motion: "stateViewMark",
    },
    {
      part: "title",
      preset: "enter",
      motion: "stateViewTitle",
    },
    {
      part: "description",
      preset: "enter",
      motion: "stateViewDescription",
    },
    {
      part: "actions",
      preset: "enter",
      motion: "stateViewActions",
    },
  ],
} as const

export type StateViewSlot = (typeof STATE_VIEW.slots)[number]
export type StateViewState = (typeof STATE_VIEW.states)[number]
export type StateViewDensity =
  (typeof STATE_VIEW.variants.density.values)[number]
