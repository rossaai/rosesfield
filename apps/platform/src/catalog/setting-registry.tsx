import type { FieldRole } from "@rosesfield/catalog/comfy"
import {
  Aperture,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
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
  Shirt,
  Smile,
  Square,
  SquareSplitVertical,
  SunMedium,
  Tag,
  User,
  Volume2,
  WandSparkles,
} from "lucide-react"
import type { ReactNode } from "react"
import { optionIconOf } from "@/catalog/setting-options"
import { AspectShape } from "@/pieces/aspect-shape"

export type SettingGroup = "format" | "content" | "last"

export type Setting = {
  icon: LucideIcon
  group: SettingGroup
}

const groupRank: Readonly<Record<SettingGroup, number>> = {
  format: 0,
  content: 1,
  last: 2,
}

const format = (icon: LucideIcon): Setting => ({ icon, group: "format" })
const content = (icon: LucideIcon): Setting => ({ icon, group: "content" })

const byRole: Readonly<Record<FieldRole, Setting | null>> = {
  prompt: null,
  aspect: format(Scan),
  resolution: format(Gem),
  quality: format(Gem),
  count: format(Hash),
  length: format(Clock),
  seed: { icon: Dices, group: "last" },
  sound: content(Volume2),
  "first-frame": content(Image),
  "last-frame": content(Image),
  reference: content(Image),
}

const byName: Readonly<Record<string, Setting>> = {
  aspect: format(Scan),
  aspectRatio: format(Scan),
  resolution: format(Gem),
  quality: format(Gem),
  count: format(Hash),
  sceneCount: format(ListOrdered),
  length: format(Clock),
  seconds: format(Clock),
  scale: format(Maximize2),
  factor: format(Maximize2),
  framing: format(Frame),
  seed: { icon: Dices, group: "last" },
  movement: content(Move),
  cameraMove: content(Move),
  camera: content(Camera),
  lens: content(Aperture),
  focus: content(Focus),
  light: content(Lightbulb),
  color: content(Palette),
  tone: content(Palette),
  mood: content(Drama),
  direction: content(Compass),
  softness: content(Feather),
  brightness: content(SunMedium),
  kind: content(Boxes),
  style: content(Brush),
  mode: content(LayoutList),
  language: content(Languages),
  expression: content(Smile),
  background: content(Image),
  sound: content(Volume2),
  keepSound: content(Volume2),
  gender: content(User),
  age: content(Hourglass),
  skinTone: content(Droplet),
  bodyType: content(PersonStanding),
  hairLength: content(Scissors),
  hairStyle: content(Scissors),
  hairColor: content(Scissors),
  eyeColor: content(Eye),
  outfit: content(Shirt),
  clothes: content(Shirt),
  keepGlasses: content(Glasses),
  plainBackground: content(Square),
  view: content(Rotate3d),
  side: content(Rotate3d),
  angleSet: content(Rotate3d),
  height: content(ArrowUpDown),
  distance: content(Search),
  effect: content(WandSparkles),
  top: content(ArrowUp),
  right: content(ArrowRight),
  bottom: content(ArrowDown),
  left: content(ArrowLeft),
  otherShots: content(Film),
  keyframe: content(GalleryHorizontal),
  part: content(SquareSplitVertical),
}

const otherSetting: Setting = content(Tag)

export function settingOf(name: string, role: FieldRole | null): Setting {
  const known = byName[name]
  if (known !== undefined) {
    return known
  }
  return (role === null ? null : byRole[role]) ?? otherSetting
}

export function isKnownSetting(name: string, role: FieldRole | null): boolean {
  return settingOf(name, role) !== otherSetting
}

export function bySettingOrder<T>(
  of: (item: T) => Setting
): (a: T, b: T) => number {
  return (a, b) => groupRank[of(a).group] - groupRank[of(b).group]
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
