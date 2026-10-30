export const anyValue = "any"

export const characterTypes = [
  "any",
  "person",
  "bold",
  "absurd",
  "mantis",
  "frog",
  "cat",
  "pug",
  "capybara",
  "goose",
] as const

export type CharacterType = (typeof characterTypes)[number]

export const genders = ["any", "woman", "man", "androgynous"] as const

export type Gender = (typeof genders)[number]

export const ages = ["any", "young-adult", "middle-aged", "older"] as const

export const builds = [
  "any",
  "slim",
  "athletic",
  "muscular",
  "curvy",
  "heavy",
  "huge",
  "half-horse",
] as const

export const heights = ["any", "average", "tall", "very-tall"] as const

export const proportions = [
  "any",
  "long-limbs",
  "short-legs",
  "broad-shoulders",
  "tiny-waist",
  "egg-body",
] as const

export const skins = [
  "any",
  "porcelain",
  "fair",
  "light",
  "olive",
  "tan",
  "brown",
  "deep-brown",
  "ebony",
] as const

export const hairstyles = [
  "any",
  "bald",
  "buzz-cut",
  "bob",
  "bowl-cut",
  "mullet",
  "flat-top",
  "pompadour",
  "afro",
  "mohawk",
  "beehive",
  "braids",
  "pigtails",
  "perm",
  "long-waves",
  "soft-serve",
  "hair-horns",
  "hair-wings",
  "spikes",
  "corkscrews",
  "curl-ball",
  "mouse-ears",
  "mushroom",
] as const

export const hairColors = [
  "any",
  "black",
  "dark-brown",
  "chestnut",
  "ginger",
  "red",
  "blond",
  "bleached-blond",
  "grey",
  "white",
  "pastel-pink",
  "lilac",
  "blue",
  "green",
] as const

export const styles = [
  "any",
  "retro",
  "sporty",
  "y2k",
  "stage",
  "goth",
  "sharp-suit",
  "street",
  "everyday",
] as const

export const headShapes = [
  "any",
  "long",
  "tiny",
  "high-forehead",
  "caveman",
  "chiselled",
  "mega-jaw",
  "round",
  "square",
  "heart",
] as const

export const necks = ["any", "column", "long", "short"] as const

export const eyeShapes = [
  "any",
  "almond",
  "round",
  "monolid",
  "close-set",
  "wide-set",
  "uneven",
  "big",
  "huge",
  "hooded",
  "sleepy",
] as const

export const eyeColors = [
  "any",
  "black",
  "brown",
  "hazel",
  "green",
  "blue",
  "ice-blue",
  "golden",
  "grey",
] as const

export const features = [
  "any",
  "freckles",
  "dimples",
  "eye-bags",
  "blush",
  "cheekbones",
  "full-lips",
  "thick-brows",
  "beauty-mark",
  "potato-nose",
  "button-nose",
  "pointy-nose",
  "pout",
  "tiny-mouth",
  "wide-mouth",
  "unibrow",
  "thin-brows",
  "jug-ears",
  "gap-teeth",
  "buck-teeth",
  "pointy-chin",
  "weak-chin",
  "big-forehead",
] as const

export const facialHairs = [
  "any",
  "clean",
  "stubble",
  "full-beard",
  "goatee",
  "moustache",
  "pencil",
  "push-broom",
  "braided",
] as const

export const marks = [
  "any",
  "odd-eyes",
  "face-tattoo",
  "nose-ring",
  "ear-piercings",
  "brow-slits",
  "bleached-brows",
  "no-brows",
  "gold-grill",
  "braces",
  "brow-scar",
  "face-gems",
  "elf-ears",
  "big-lashes",
  "nose-tape",
] as const

export const accessories = [
  "any",
  "none",
  "glasses",
  "headphones",
  "earrings",
  "hat",
  "bag",
] as const

/** One trait section a person picks from: one input, or several slots of one list when the section takes several at once. */
export type TraitSection = {
  name: string
  values: readonly string[]
  slots: number
}

export const traitSections: readonly TraitSection[] = [
  { name: "characterType", values: characterTypes, slots: 1 },
  { name: "gender", values: genders, slots: 1 },
  { name: "age", values: ages, slots: 1 },
  { name: "build", values: builds, slots: 1 },
  { name: "stature", values: heights, slots: 1 },
  { name: "proportions", values: proportions, slots: 2 },
  { name: "skin", values: skins, slots: 1 },
  { name: "hairstyle", values: hairstyles, slots: 1 },
  { name: "hairColor", values: hairColors, slots: 1 },
  { name: "outfit", values: styles, slots: 1 },
  { name: "headShape", values: headShapes, slots: 1 },
  { name: "neck", values: necks, slots: 1 },
  { name: "eyeShape", values: eyeShapes, slots: 1 },
  { name: "eyeColor", values: eyeColors, slots: 1 },
  { name: "features", values: features, slots: 3 },
  { name: "facialHair", values: facialHairs, slots: 1 },
  { name: "marks", values: marks, slots: 2 },
  { name: "accessory", values: accessories, slots: 1 },
]

/** The input names of one section: the section's own name, or one name per slot, `features1` to `features3`. */
export function slotNamesOf(section: TraitSection): string[] {
  return section.slots === 1
    ? [section.name]
    : Array.from({ length: section.slots }, (_, index) => {
        return `${section.name}${index + 1}`
      })
}

export const traitInputNames: readonly string[] =
  traitSections.flatMap(slotNamesOf)

export function camelOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}
