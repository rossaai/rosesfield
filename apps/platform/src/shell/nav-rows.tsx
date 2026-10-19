import {
  AudioLinesIcon,
  BotIcon,
  BoxIcon,
  ClapperboardIcon,
  CompassIcon,
  FilmIcon,
  GalleryHorizontalEndIcon,
  HistoryIcon,
  ImageIcon,
  ImagesIcon,
  ImageUpscaleIcon,
  LayersIcon,
  MegaphoneIcon,
  PenLineIcon,
  PersonStandingIcon,
  PlugIcon,
  ReplaceIcon,
  SpeechIcon,
  UsersIcon,
  VideoIcon,
  WandIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { findCatalogApp } from "@/catalog/catalog-apps"
import type { CopyKey } from "@/copy.en"

export type ScreenPath =
  | "/"
  | "/characters"
  | "/agent"
  | "/library"
  | "/history"
  | "/connect"
  | "/settings"

export type NavTarget =
  | { kind: "screen"; to: ScreenPath }
  | { kind: "app"; appId: string }

export type NavRow = {
  id: string
  label: CopyKey
  icon: ReactElement
  target: NavTarget
}

type AreaSpec = {
  id: string
  label: CopyKey
  icon: ReactElement
  appIds: readonly string[]
}

const glyph = (Icon: typeof ImageIcon): ReactElement => (
  <Icon aria-hidden="true" />
)

const areaSpecs: readonly AreaSpec[] = [
  {
    id: "image",
    label: "shell.area.image",
    icon: glyph(ImageIcon),
    appIds: ["image"],
  },
  {
    id: "video",
    label: "shell.area.video",
    icon: glyph(VideoIcon),
    appIds: ["video"],
  },
  {
    id: "video-edit",
    label: "shell.area.video-edit",
    icon: glyph(FilmIcon),
    appIds: ["video-edit"],
  },
  {
    id: "effects",
    label: "shell.area.effects",
    icon: glyph(WandIcon),
    appIds: ["effects"],
  },
  {
    id: "edit",
    label: "shell.area.edit",
    icon: glyph(PenLineIcon),
    appIds: ["edit"],
  },
  {
    id: "audio",
    label: "shell.area.audio",
    icon: glyph(AudioLinesIcon),
    appIds: ["audio", "voice"],
  },
  {
    id: "lipsync",
    label: "shell.area.lipsync",
    icon: glyph(SpeechIcon),
    appIds: ["lipsync"],
  },
  {
    id: "upscale",
    label: "shell.area.upscale",
    icon: glyph(ImageUpscaleIcon),
    appIds: ["upscale"],
  },
  {
    id: "three-d",
    label: "shell.area.three-d",
    icon: glyph(BoxIcon),
    appIds: ["three-d"],
  },
  {
    id: "motion",
    label: "shell.area.motion",
    icon: glyph(PersonStandingIcon),
    appIds: ["motion"],
  },
]

const chainSpecs: readonly AreaSpec[] = [
  {
    id: "shot",
    label: "shell.area.shot",
    icon: glyph(ClapperboardIcon),
    appIds: ["shot"],
  },
  {
    id: "storyboard",
    label: "shell.area.storyboard",
    icon: glyph(GalleryHorizontalEndIcon),
    appIds: ["storyboard"],
  },
  {
    id: "layers",
    label: "shell.area.layers",
    icon: glyph(LayersIcon),
    appIds: ["layers"],
  },
  {
    id: "ads",
    label: "shell.area.ads",
    icon: glyph(MegaphoneIcon),
    appIds: ["ads"],
  },
  {
    id: "remake",
    label: "shell.area.remake",
    icon: glyph(ReplaceIcon),
    appIds: ["remake"],
  },
]

function rowOf(spec: AreaSpec, hasApp: (appId: string) => boolean): NavRow[] {
  const appId = spec.appIds.find(hasApp)
  return appId === undefined
    ? []
    : [
        {
          id: spec.id,
          label: spec.label,
          icon: spec.icon,
          target: { kind: "app", appId },
        },
      ]
}

function screenRow(
  id: string,
  label: CopyKey,
  icon: ReactElement,
  to: ScreenPath
): NavRow {
  return { id, label, icon, target: { kind: "screen", to } }
}

export type NavGroups = {
  explore: NavRow
  areas: NavRow[]
  chains: NavRow[]
  work: NavRow[]
}

const hasCatalogApp = (appId: string): boolean => findCatalogApp(appId) !== null

export function navGroups(
  hasApp: (appId: string) => boolean = hasCatalogApp
): NavGroups {
  return {
    explore: screenRow("explore", "shell.nav.explore", glyph(CompassIcon), "/"),
    areas: areaSpecs.flatMap((spec) => rowOf(spec, hasApp)),
    chains: [
      screenRow(
        "characters",
        "shell.nav.characters",
        glyph(UsersIcon),
        "/characters"
      ),
      ...chainSpecs.flatMap((spec) => rowOf(spec, hasApp)),
    ],
    work: [
      screenRow("agent", "shell.nav.agent", glyph(BotIcon), "/agent"),
      screenRow("library", "shell.nav.library", glyph(ImagesIcon), "/library"),
      screenRow("history", "shell.nav.history", glyph(HistoryIcon), "/history"),
      screenRow("connect", "shell.nav.connect", glyph(PlugIcon), "/connect"),
    ],
  }
}

export function createRows(groups: NavGroups): NavRow[] {
  return [...groups.areas, ...groups.chains]
}
