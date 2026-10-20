// Generated. Do not edit.

export const COMPOSER_ATTACHMENTS = {
  id: "composer-attachments",
  name: "ComposerAttachments",
  slots: ["row", "tiles", "edge"],
  variants: {},
  states: [
    "photo",
    "uploading",
    "file",
    "waiting",
    "mixed",
    "pasted",
    "failed",
    "offline",
    "oversize",
    "longest",
    "many",
    "scrolled",
    "hover",
    "focus",
    "dragging",
    "menu",
    "none",
  ],
  sizes: {
    photo: {
      phone: "component.composer.thumb",
      tablet: "component.composer.thumb",
      desktop: "component.composer.thumb",
    },
    badge: {
      phone: "control.hitBadge",
      tablet: "control.hitBadge",
      desktop: "control.hitBadge",
    },
    dragThreshold: {
      phone: "space.s2",
      tablet: "space.s2",
      desktop: "space.s2",
    },
  },
  material: {
    material: "none",
    ground: "color.surface",
  },
  motion: [
    {
      part: "tileArrive",
      preset: "enter",
      motion: "thumbArrive",
    },
    {
      part: "rowWidth",
      preset: "yield",
      motion: "none",
    },
    {
      part: "tileMove",
      preset: "travel",
      motion: "none",
    },
  ],
} as const

export type ComposerAttachmentsSlot =
  (typeof COMPOSER_ATTACHMENTS.slots)[number]
export type ComposerAttachmentsState =
  (typeof COMPOSER_ATTACHMENTS.states)[number]
