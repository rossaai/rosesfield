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
  Leaf,
  Lightbulb,
  ListOrdered,
  type LucideIcon,
  Maximize2,
  Mic,
  Move,
  Palette,
  PersonStanding,
  Repeat,
  Rotate3d,
  Scan,
  Scissors,
  Search,
  Shapes,
  Shirt,
  Smile,
  Square,
  SquareSplitVertical,
  SunMedium,
  Tag,
  Triangle,
  User,
  Volume2,
  WandSparkles,
} from "lucide-react"
import type { ReactElement } from "react"
import { optionIconOf } from "@/catalog/setting-options"
import { AspectShape } from "@/pieces/aspect-shape"
import { settingKeyOf } from "@/screens/app/setting-table"

export type Setting = {
  icon: LucideIcon
  rank: number
}

type Entry = readonly [name: string, icon: LucideIcon]

const formatEntries: readonly Entry[] = [
  ["aspect", Scan],
  ["aspectRatio", Scan],
  ["framing", Frame],
  ["resolution", Gem],
  ["quality", Gem],
  ["renderingSpeed", Gem],
  ["scale", Maximize2],
  ["factor", Maximize2],
  ["scaleFactor", Maximize2],
  ["upscaleFactor", Maximize2],
  ["desiredIncrease", Maximize2],
  ["targetResolution", Maximize2],
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
  ["voiceId", Mic],
  ["language", Languages],
  ["languageCode", Languages],
  ["locale", Languages],
  ["voiceLanguage", Languages],
  ["season", Leaf],
  ["lightDirection", Compass],
  ["lightType", Lightbulb],
  ["artStyle", Brush],
  ["backgroundColor", Image],
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
  ["negativePrompt", Ban],
  ["loop", Repeat],
  ["speed", Gauge],
  ["voiceSpeed", Gauge],
  ["speechRate", Gauge],
  ["topology", Triangle],
  ["targetPolycount", Shapes],
  ["poseMode", PersonStanding],
]

const byName: ReadonlyMap<string, Setting> = new Map(
  [...formatEntries, ...contentEntries, ...advancedEntries].map(
    ([name, icon], rank) => [settingKeyOf(name), { icon, rank }]
  )
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

export function isAspectSetting(name: string, role: FieldRole | null): boolean {
  return role === "aspect" || settingKeyOf(name).startsWith("aspect")
}

export function settingIconOf(
  name: string,
  role: FieldRole | null
): ReactElement {
  const Icon = settingOf(name, role).icon
  return <Icon />
}

export function chosenIconOf(
  name: string,
  role: FieldRole | null,
  value: string
): ReactElement {
  const Icon = value === "auto" ? undefined : optionIconOf(name, value)
  return Icon === undefined ? settingIconOf(name, role) : <Icon />
}

export function withOptionIcons<T extends { value: string }>(
  name: string,
  options: readonly T[]
): (T & { icon?: ReactElement })[] {
  return options.map((option) => {
    const Icon = optionIconOf(name, option.value)
    return Icon === undefined ? option : { ...option, icon: <Icon /> }
  })
}

export function withShapes<T extends { value: string; label: string }>(
  items: readonly T[]
): (T & { icon: ReactElement })[] {
  return items.map((item) => ({
    ...item,
    icon: <AspectShape ratio={item.value} />,
  }))
}

export { optionIconOf, settingKeyOf }
