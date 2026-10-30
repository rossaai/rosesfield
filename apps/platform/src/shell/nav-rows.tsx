import type { AppListing } from "@rosesfield/contract"
import { Badge } from "@rosesfield/ui/components/badge"
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
  PlugIcon,
  RepeatIcon,
  ReplaceIcon,
  Rotate3dIcon,
  SettingsIcon,
  ShirtIcon,
  SpeechIcon,
  SquareUserIcon,
  SunIcon,
  UserStarIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { isFeaturedApp } from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
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

export type MediaArea = {
  id: MediaKind
  label: CopyKey
  apps: AppListing[]
}

export type FeaturedPair = {
  agent: ScreenLink
  apps: AppListing[]
}

export type NavGroups = {
  explore: ScreenLink
  areas: MediaArea[]
  mcp: ScreenLink
  featured: FeaturedPair
  rest: ScreenLink[]
}

type Glyph = typeof ImageIcon

const areaLabels = {
  image: "shell.area.image",
  video: "shell.area.video",
  audio: "shell.area.audio",
  mesh: "shell.area.mesh",
} satisfies Record<MediaKind, CopyKey>

const kindGlyphs = {
  image: ImageIcon,
  video: VideoIcon,
  audio: AudioLinesIcon,
  character: UsersIcon,
} satisfies Record<AppListing["category"], Glyph>

const appGlyphs: Readonly<Record<string, Glyph>> = {
  ads: MegaphoneIcon,
  "ai-influencer": UserStarIcon,
  angles: Rotate3dIcon,
  "background-removal": EraserIcon,
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

export const mcpLink = screenLink("mcp", "shell.nav.mcp", PlugIcon, "/connect")

export function FeaturedBadge(): ReactElement {
  return <Badge kind="featured">{t("shell.nav.featured")}</Badge>
}

export function AppNameBadge({
  app,
}: {
  app: AppListing
}): ReactElement | null {
  return isFeaturedApp(app) ? <FeaturedBadge /> : null
}

export function navGroups(
  apps: readonly AppListing[] = catalogApps
): NavGroups {
  const kinds: readonly MediaKind[] = ["image", "video", "audio", "mesh"]
  return {
    explore: exploreLink,
    areas: kinds.flatMap((kind) => {
      const inArea = apps.filter(
        (app) => app.category !== "character" && app.output.kind === kind
      )
      return inArea.length === 0
        ? []
        : [{ id: kind, label: areaLabels[kind], apps: inArea }]
    }),
    mcp: mcpLink,
    featured: {
      agent: screenLink("agent", "shell.nav.agent", BotIcon, "/agent"),
      apps: apps.filter(isFeaturedApp),
    },
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
