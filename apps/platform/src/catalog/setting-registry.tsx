import type { FieldRole } from "@rosesfield/catalog/comfy"
import {
  Aperture,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Boxes,
  Brush,
  Camera,
  Clock,
  Compass,
  Dices,
  Drama,
  Droplet,
  Eye,
  Feather,
  Film,
  Focus,
  Footprints,
  Frame,
  GalleryHorizontal,
  Gauge,
  Gem,
  Glasses,
  Hash,
  Hourglass,
  Image,
  Languages,
  LayoutList,
  Lightbulb,
  ListOrdered,
  type LucideIcon,
  Maximize2,
  Move,
  Palette,
  PersonStanding,
  Rotate3d,
  Scan,
  Scissors,
  Search,
  ShieldCheck,
  Shirt,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Square,
  SquareSplitVertical,
  Stamp,
  SunMedium,
  Tag,
  User,
  Volume2,
  WandSparkles,
} from "lucide-react"
import type { ReactNode } from "react"
import { optionIconOf } from "@/catalog/setting-options"
import { AspectShape } from "@/pieces/aspect-shape"

export type SettingGroup = "format" | "content" | "advanced"

export type Setting = {
  icon: LucideIcon
  group: SettingGroup
  rank: number
}

type Entry = readonly [name: string, icon: LucideIcon]

const formatEntries: readonly Entry[] = [
  ["aspect", Scan],
  ["aspectRatio", Scan],
  ["framing", Frame],
  ["resolution", Gem],
  ["quality", Gem],
  ["scale", Maximize2],
  ["factor", Maximize2],
  ["length", Clock],
  ["seconds", Clock],
  ["count", Hash],
  ["sceneCount", ListOrdered],
]

const contentEntries: readonly Entry[] = [
  ["movement", Move],
  ["cameraMove", Move],
  ["camera", Camera],
  ["lens", Aperture],
  ["focus", Focus],
  ["light", Lightbulb],
  ["color", Palette],
  ["tone", Palette],
  ["mood", Drama],
  ["direction", Compass],
  ["softness", Feather],
  ["brightness", SunMedium],
  ["kind", Boxes],
  ["style", Brush],
  ["mode", LayoutList],
  ["language", Languages],
  ["expression", Smile],
  ["background", Image],
  ["sound", Volume2],
  ["keepSound", Volume2],
  ["gender", User],
  ["age", Hourglass],
  ["skinTone", Droplet],
  ["bodyType", PersonStanding],
  ["hairLength", Scissors],
  ["hairStyle", Scissors],
  ["hairColor", Scissors],
  ["eyeColor", Eye],
  ["outfit", Shirt],
  ["clothes", Shirt],
  ["keepGlasses", Glasses],
  ["plainBackground", Square],
  ["view", Rotate3d],
  ["side", Rotate3d],
  ["angleSet", Rotate3d],
  ["height", ArrowUpDown],
  ["distance", Search],
  ["effect", WandSparkles],
  ["top", ArrowUp],
  ["right", ArrowRight],
  ["bottom", ArrowDown],
  ["left", ArrowLeft],
  ["otherShots", Film],
  ["keyframe", GalleryHorizontal],
  ["part", SquareSplitVertical],
  ["firstFrame", Image],
  ["lastFrame", Image],
  ["reference", Image],
]

const advancedEntries: readonly Entry[] = [
  ["seed", Dices],
  ["serviceTier", Gauge],
  ["negativePrompt", Ban],
  ["guidance", SlidersHorizontal],
  ["guidanceScale", SlidersHorizontal],
  ["cfg", SlidersHorizontal],
  ["cfgScale", SlidersHorizontal],
  ["steps", Footprints],
  ["numInferenceSteps", Footprints],
  ["inferenceSteps", Footprints],
  ["safety", ShieldCheck],
  ["safetyChecker", ShieldCheck],
  ["enableSafetyChecker", ShieldCheck],
  ["safetyTolerance", ShieldCheck],
  ["safetyFilterLevel", ShieldCheck],
  ["promptExtend", Sparkles],
  ["promptEnhance", Sparkles],
  ["enhancePrompt", Sparkles],
  ["promptOptimizer", Sparkles],
  ["promptUpsampling", Sparkles],
  ["promptExpansion", Sparkles],
  ["watermark", Stamp],
  ["addWatermark", Stamp],
]

export function settingKeyOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

const groups: readonly (readonly [SettingGroup, readonly Entry[]])[] = [
  ["format", formatEntries],
  ["content", contentEntries],
  ["advanced", advancedEntries],
]

const byName: ReadonlyMap<string, Setting> = new Map(
  groups
    .flatMap(([group, entries]) =>
      entries.map(([name, icon]) => ({ name, icon, group }))
    )
    .map(({ name, icon, group }, rank) => [
      settingKeyOf(name),
      { icon, group, rank },
    ])
)

const roleNames: Readonly<Record<FieldRole, string | null>> = {
  prompt: null,
  aspect: "aspect",
  resolution: "resolution",
  quality: "quality",
  count: "count",
  length: "length",
  seed: "seed",
  sound: "sound",
  "first-frame": "firstFrame",
  "last-frame": "lastFrame",
  reference: "reference",
}

const otherSetting: Setting = {
  icon: Tag,
  group: "advanced",
  rank: byName.size,
}

export function settingOf(name: string, role: FieldRole | null): Setting {
  const known = byName.get(settingKeyOf(name))
  if (known !== undefined) {
    return known
  }
  const roleName = role === null ? null : roleNames[role]
  return (roleName === null ? undefined : byName.get(roleName)) ?? otherSetting
}

export function isKnownSetting(name: string, role: FieldRole | null): boolean {
  return settingOf(name, role) !== otherSetting
}

export function withOptionIcons<T extends { value: string }>(
  name: string,
  options: readonly T[]
): (T & { icon?: ReactNode })[] {
  return options.map((option) => {
    const Icon = optionIconOf(name, option.value)
    return Icon === undefined ? option : { ...option, icon: <Icon /> }
  })
}

export function withShapes<T extends { value: string; label: string }>(
  items: readonly T[]
): (T & { icon: ReactNode })[] {
  return items.map((item) => ({
    ...item,
    icon: <AspectShape ratio={item.value} />,
  }))
}

export { optionIconOf }
