import type { AppEntry } from "#define-app"
import { app as ads } from "#ads/app"
import { app as angles } from "#angles/app"
import { app as audio } from "#audio/app"
import { app as backgroundRemoval } from "#background-removal/app"
import { app as characters } from "#characters/app"
import { app as edit } from "#edit/app"
import { app as effects } from "#effects/app"
import { app as expand } from "#expand/app"
import { app as headshots } from "#headshots/app"
import { app as image } from "#image/app"
import { app as layers } from "#layers/app"
import { app as lipsync } from "#lipsync/app"
import { app as motion } from "#motion/app"
import { app as music } from "#music/app"
import { app as relight } from "#relight/app"
import { app as remake } from "#remake/app"
import { app as shot } from "#shot/app"
import { app as soundEffects } from "#sound-effects/app"
import { app as speech } from "#speech/app"
import { app as storyboard } from "#storyboard/app"
import { app as threeD } from "#three-d/app"
import { app as tryOn } from "#try-on/app"
import { app as upscale } from "#upscale/app"
import { app as video } from "#video/app"
import { app as videoEdit } from "#video-edit/app"
import { app as voiceChange } from "#voice-change/app"
import { app as voiceClone } from "#voice-clone/app"

export const apps: readonly AppEntry[] = [
  { folder: "ads", app: ads },
  { folder: "angles", app: angles },
  { folder: "audio", app: audio },
  { folder: "background-removal", app: backgroundRemoval },
  { folder: "characters", app: characters },
  { folder: "edit", app: edit },
  { folder: "effects", app: effects },
  { folder: "expand", app: expand },
  { folder: "headshots", app: headshots },
  { folder: "image", app: image },
  { folder: "layers", app: layers },
  { folder: "lipsync", app: lipsync },
  { folder: "motion", app: motion },
  { folder: "music", app: music },
  { folder: "relight", app: relight },
  { folder: "remake", app: remake },
  { folder: "shot", app: shot },
  { folder: "sound-effects", app: soundEffects },
  { folder: "speech", app: speech },
  { folder: "storyboard", app: storyboard },
  { folder: "three-d", app: threeD },
  { folder: "try-on", app: tryOn },
  { folder: "upscale", app: upscale },
  { folder: "video", app: video },
  { folder: "video-edit", app: videoEdit },
  { folder: "voice-change", app: voiceChange },
  { folder: "voice-clone", app: voiceClone },
]
