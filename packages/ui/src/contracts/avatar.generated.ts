// Generated. Do not edit.

export const AVATAR = {
  id: "avatar",
  name: "Avatar",
  slots: ["face"],
  variants: {
    size: {
      values: ["badge", "rail", "touch"],
      default: "touch",
    },
    ground: {
      values: ["canvas", "surface", "surface2", "layer", "layerWell"],
      default: "layer",
    },
  },
  states: ["initials", "image", "loading", "failed", "skeleton"],
  sizes: {
    touch: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    rail: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    badge: {
      phone: "control.hitBadge",
      tablet: "control.hitBadge",
      desktop: "control.hitBadge",
    },
    initialsSize: {
      phone: "type.legalSize",
      tablet: "type.legalSize",
      desktop: "type.legalSize",
    },
    radius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
  },
  variables: {
    "control.hitBadge": ["--spacing-remove-badge"],
    "control.hitRailDense": ["--spacing-button-small", "--spacing-icon-small"],
    "control.hitTouch": ["--spacing-button", "--spacing-icon"],
    "radius.full": ["--radius-full"],
    "type.legalSize": ["--text-legal"],
  },
  material: {
    material: "none",
    ground: "region",
  },
  motion: [],
} as const

export type AvatarSlot = (typeof AVATAR.slots)[number]
export type AvatarState = (typeof AVATAR.states)[number]
export type AvatarSize = (typeof AVATAR.variants.size.values)[number]
export type AvatarGround = (typeof AVATAR.variants.ground.values)[number]
