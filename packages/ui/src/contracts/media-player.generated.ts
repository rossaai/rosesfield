// Generated. Do not edit.

export const MEDIA_PLAYER = {
  id: "media-player",
  name: "MediaPlayer",
  slots: [
    "picture",
    "veil",
    "play",
    "corners",
    "download",
    "bar",
    "waveform",
    "time",
    "title",
    "times",
    "fault",
  ],
  variants: {
    form: {
      values: ["video", "sound", "transport"],
      default: "video",
    },
    size: {
      values: ["inline", "stage"],
      default: "inline",
    },
  },
  states: [
    "waiting",
    "paused",
    "playing",
    "controlsHidden",
    "scrubbing",
    "muted",
    "ended",
    "live",
    "fullScreen",
    "failed",
    "unplayable",
  ],
  sizes: {
    chromeCircle: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    cornerGap: {
      phone: "space.s2_5",
      tablet: "space.s2_5",
      desktop: "space.s2_5",
    },
    barHeight: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    barRadius: {
      phone: "radius.full",
      tablet: "radius.full",
      desktop: "radius.full",
    },
    circleToTime: {
      phone: "space.s1",
      tablet: "space.s1",
      desktop: "space.s1",
    },
    timeToScrubber: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    soundHeight: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    soundLead: {
      phone: "control.hitRailDense",
      tablet: "control.hitRailDense",
      desktop: "control.hitRailDense",
    },
    soundStartInset: {
      phone: "space.s1_5",
      tablet: "space.s1_5",
      desktop: "space.s1_5",
    },
    soundEndInset: {
      phone: "space.s3",
      tablet: "space.s3",
      desktop: "space.s3",
    },
    soundWidest: {
      phone: "component.button.maxWidth",
      tablet: "component.button.maxWidth",
      desktop: "component.button.maxWidth",
    },
    soundWaveform: {
      phone: "icon.uiSize",
      tablet: "icon.uiSize",
      desktop: "icon.uiSize",
    },
    soundPageInset: {
      phone: "space.s6",
      tablet: "space.s6",
      desktop: "space.s6",
    },
    soundPageWaveform: {
      phone: "control.hitTouch",
      tablet: "control.hitTouch",
      desktop: "control.hitTouch",
    },
    soundPageMeasure: {
      phone: "component.marketing.readingMeasure",
      tablet: "component.marketing.readingMeasure",
      desktop: "component.marketing.readingMeasure",
    },
    controlsRest: {
      phone: "motion.dwell.controls",
      tablet: "motion.dwell.controls",
      desktop: "motion.dwell.controls",
    },
  },
  material: {
    material: "material.glass",
    ground: "region",
  },
  motion: [
    {
      part: "controls",
      preset: "enter",
      motion: "none",
    },
    {
      part: "playPause",
      preset: "swap",
      motion: "none",
    },
    {
      part: "scrubber",
      preset: "disclosure",
      motion: "none",
    },
    {
      part: "download",
      preset: "tint",
      motion: "none",
    },
    {
      part: "bars",
      preset: "disclosure",
      motion: "none",
    },
  ],
} as const

export type MediaPlayerSlot = (typeof MEDIA_PLAYER.slots)[number]
export type MediaPlayerState = (typeof MEDIA_PLAYER.states)[number]
export type MediaPlayerForm = (typeof MEDIA_PLAYER.variants.form.values)[number]
export type MediaPlayerSize = (typeof MEDIA_PLAYER.variants.size.values)[number]
