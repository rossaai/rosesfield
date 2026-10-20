// Generated. Do not edit.

export const ALERT_DIALOG = {
  id: "alert-dialog",
  name: "AlertDialog",
  slots: ["title", "description", "field", "actions"],
  variants: {
    intent: {
      values: ["confirm", "destroy"],
      default: "confirm",
    },
    stack: {
      values: ["no", "yes"],
      default: "no",
    },
  },
  states: ["open", "closing", "pending", "stacked", "discard"],
  sizes: {
    width: {
      phone: "component.alert.width",
      tablet: "component.alert.width",
      desktop: "component.alert.width",
    },
    titleToDescription: {
      phone: "space.s2_5",
      tablet: "space.s2_5",
      desktop: "space.s2_5",
    },
    titleSize: {
      phone: "type.bodySize",
      tablet: "type.bodySize",
      desktop: "type.bodySize",
    },
    buttonHeight: {
      phone: "control.btn",
      tablet: "control.btn",
      desktop: "control.btn",
    },
    radius: {
      phone: "radius.r8",
      tablet: "radius.r8",
      desktop: "radius.r8",
    },
  },
  variables: {
    "component.alert.width": ["--spacing-alert"],
    "control.btn": ["--spacing-field"],
    "radius.r8": ["--radius-vessel"],
    "space.s2_5": ["--spacing-s2_5"],
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

export type AlertDialogSlot = (typeof ALERT_DIALOG.slots)[number]
export type AlertDialogState = (typeof ALERT_DIALOG.states)[number]
export type AlertDialogIntent =
  (typeof ALERT_DIALOG.variants.intent.values)[number]
export type AlertDialogStack =
  (typeof ALERT_DIALOG.variants.stack.values)[number]
