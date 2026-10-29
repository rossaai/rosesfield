import type { AppListing } from "@rosesfield/contract"
import {
  AudioLinesIcon,
  AudioWaveformIcon,
  BotIcon,
  BoxIcon,
  ClapperboardIcon,
  CompassIcon,
  EraserIcon,
  ExpandIcon,
  FilmIcon,
  GalleryHorizontalEndIcon,
  HistoryIcon,
  ImageIcon,
  ImagesIcon,
  ImageUpscaleIcon,
  LayersIcon,
  MegaphoneIcon,
  MessageSquareTextIcon,
  MicIcon,
  MusicIcon,
  PersonStandingIcon,
  RepeatIcon,
  ReplaceIcon,
  Rotate3dIcon,
  SettingsIcon,
  ShirtIcon,
  SparklesIcon,
  SpeechIcon,
  SquareUserIcon,
  SunIcon,
  UsersIcon,
  VideoIcon,
  WandIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { catalogApps } from "@/catalog/catalog-apps"
import type { CopyKey } from "@/copy.en"

export type ScreenPath =
  | "/"
  | "/characters"
  | "/agent"
  | "/library"
  | "/history"
  | "/connect"
  | "/settings"

export type ScreenLink = {
  id: string
  label: CopyKey
  icon: ReactElement
  to: ScreenPath
}

type MediaKind = "image" | "video" | "audio" | "mesh"

type AreaId = MediaKind | "vfx"

export type MediaArea = {
  id: AreaId
  label: CopyKey
  apps: AppListing[]
}

export type NavGroups = {
  explore: ScreenLink
  areas: MediaArea[]
  agent: ScreenLink
  rest: ScreenLink[]
}

type Glyph = typeof ImageIcon

const areaLabels = {
  image: "shell.area.image",
  video: "shell.area.video",
  audio: "shell.area.audio",
  mesh: "shell.area.mesh",
  vfx: "shell.area.vfx",
} satisfies Record<AreaId, CopyKey>

export const vfxAreaApps: readonly string[] = ["vfx", "effects"]

const kindGlyphs = {
  image: ImageIcon,
  video: VideoIcon,
  audio: AudioLinesIcon,
  character: UsersIcon,
} satisfies Record<AppListing["category"], Glyph>

const appGlyphs: Readonly<Record<string, Glyph>> = {
  ads: MegaphoneIcon,
  angles: Rotate3dIcon,
  "background-removal": EraserIcon,
  effects: WandIcon,
  expand: ExpandIcon,
  headshots: SquareUserIcon,
  layers: LayersIcon,
  lipsync: SpeechIcon,
  motion: PersonStandingIcon,
  recast: ReplaceIcon,
  relight: SunIcon,
  shot: ClapperboardIcon,
  storyboard: GalleryHorizontalEndIcon,
  "try-on": ShirtIcon,
  upscale: ImageUpscaleIcon,
  "video-edit": FilmIcon,
  speech: MessageSquareTextIcon,
  "voice-clone": MicIcon,
  "voice-change": RepeatIcon,
  music: MusicIcon,
  "sound-effects": AudioWaveformIcon,
  "three-d": BoxIcon,
  vfx: SparklesIcon,
}

const glyph = (Icon: Glyph): ReactElement => <Icon aria-hidden="true" />

export function appIcon(app: AppListing): ReactElement {
  return glyph(appGlyphs[app.id] ?? kindGlyphs[app.category])
}

function screenLink(
  id: string,
  label: CopyKey,
  icon: Glyph,
  to: ScreenPath
): ScreenLink {
  return { id, label, icon: glyph(icon), to }
}

export const exploreLink = screenLink(
  "explore",
  "shell.nav.explore",
  CompassIcon,
  "/"
)
export const libraryLink = screenLink(
  "library",
  "shell.nav.library",
  ImagesIcon,
  "/library"
)
export const historyLink = screenLink(
  "history",
  "shell.nav.history",
  HistoryIcon,
  "/history"
)

export function navGroups(
  apps: readonly AppListing[] = catalogApps
): NavGroups {
  const kinds: readonly MediaKind[] = ["image", "video", "audio", "mesh"]
  const vfxArea: MediaArea = {
    id: "vfx",
    label: areaLabels.vfx,
    apps: vfxAreaApps.flatMap((id) => apps.find((app) => app.id === id) ?? []),
  }
  const media = kinds.map(
    (kind): MediaArea => ({
      id: kind,
      label: areaLabels[kind],
      apps: apps.filter(
        (app) =>
          app.category !== "character" &&
          app.output.kind === kind &&
          !vfxAreaApps.includes(app.id)
      ),
    })
  )
  return {
    explore: exploreLink,
    areas: [...media, vfxArea].filter((area) => area.apps.length > 0),
    agent: screenLink("agent", "shell.nav.agent", BotIcon, "/agent"),
    rest: [
      screenLink(
        "characters",
        "shell.nav.characters",
        UsersIcon,
        "/characters"
      ),
      libraryLink,
      historyLink,
      screenLink("settings", "shell.nav.settings", SettingsIcon, "/settings"),
    ],
  }
}
