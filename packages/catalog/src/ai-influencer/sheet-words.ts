import type { CharacterType } from "#ai-influencer/traits"

type Words = Readonly<Record<string, string>>

export type Animal = {
  headed: string
  head: string
  eyes: string
  extra?: string
}

export const animals: Readonly<Partial<Record<CharacterType, Animal>>> = {
  mantis: {
    headed: "praying-mantis-headed",
    head: "bright green praying mantis head",
    eyes: "huge compound eyes and antennae",
  },
  frog: {
    headed: "frog-headed",
    head: "wide-mouthed green toad head",
    eyes: "bulging golden eyes",
  },
  cat: {
    headed: "cat-headed",
    head: "ginger tabby cat head",
    eyes: "round green eyes",
    extra: "long whiskers",
  },
  pug: {
    headed: "pug-headed",
    head: "wrinkly fawn pug head",
    eyes: "big glossy dark eyes",
    extra: "a flat black snout",
  },
  capybara: {
    headed: "capybara-headed",
    head: "capybara head",
    eyes: "sleepy deadpan eyes",
  },
  goose: {
    headed: "goose-headed",
    head: "white goose head",
    eyes: "small black eyes",
    extra: "an orange beak",
  },
}

export const personWords: Words = {
  any: "",
  person: "",
  bold: "bold-looking",
  absurd: "absurd",
}

export const nouns: Words = {
  any: "person",
  woman: "woman",
  man: "man",
  androgynous: "androgynous person",
}

export const ageWords: Words = {
  "young-adult": "young",
  "middle-aged": "middle-aged",
  older: "elderly",
}

export const buildWords: Words = {
  slim: "slim",
  athletic: "athletic",
  muscular: "muscular",
  curvy: "curvy",
  heavy: "heavy-set",
  huge: "hugely muscular",
}

export const halfHorse =
  "a centaur body, human from the waist up and a horse from the waist down"

export const heightWords: Words = {
  tall: "tall",
  "very-tall": "very tall",
}

export const eggBody = "egg-body"

export const proportionWords: Words = {
  "long-limbs": "long limbs",
  "short-legs": "short legs",
  "broad-shoulders": "broad shoulders",
  "tiny-waist": "a tiny waist",
}

export const skinWords: Words = {
  porcelain: "porcelain skin",
  fair: "fair skin",
  light: "light skin",
  olive: "olive skin",
  tan: "tan skin",
  brown: "brown skin",
  "deep-brown": "deep brown skin",
  ebony: "very dark skin",
}

/** A hairstyle with `{color}` where its colour goes, so `flat-top` in black reads "a tall perfectly flat black flat-top haircut". */
export const hairWords: Words = {
  bald: "a shiny bald head",
  "buzz-cut": "a {color}buzz cut",
  bob: "a sharp {color}bob haircut",
  "bowl-cut": "a perfectly round {color}bowl cut",
  mullet: "a long {color}mullet haircut",
  "flat-top": "a tall perfectly flat {color}flat-top haircut",
  pompadour: "a towering glossy {color}pompadour",
  afro: "a huge round {color}afro",
  mohawk: "a tall spiked {color}mohawk",
  beehive: "an enormous {color}curly bouffant beehive hairdo",
  braids: "long {color}braids",
  pigtails: "two high {color}pigtails",
  perm: "a tight curly {color}perm",
  "long-waves": "long voluminous {color}waves",
  "soft-serve":
    "a towering {color}soft-serve swirl hairdo like an ice cream cone",
  "hair-horns": "two stiff {color}hair horns pointing up",
  "hair-wings": "two stiff {color}hair wings sticking out to the sides",
  spikes: "short stiff {color}hedgehog spikes",
  corkscrews: "long {color}corkscrew curls",
  "curl-ball": "a perfect sphere of tight {color}curls",
  "mouse-ears": "two round {color}hair puffs like mouse ears",
  mushroom: "a {color}mushroom-cap haircut",
}

export const colorWords: Words = {
  black: "black",
  "dark-brown": "dark brown",
  chestnut: "chestnut",
  ginger: "ginger",
  red: "red",
  blond: "blond",
  "bleached-blond": "bleached-blond",
  grey: "grey",
  white: "white",
  "pastel-pink": "pastel-pink",
  lilac: "lilac",
  blue: "electric blue",
  green: "bright green",
}

export const styleWords: Words = {
  retro:
    "a retro 1970s chocolate-brown suit with huge lapels, a cream turtleneck and brown platform shoes",
  sporty: "a lime-green retro tracksuit with white stripes and white sneakers",
  y2k: "a Y2K baby-blue velour tracksuit, a thick silver chain and chunky white sneakers",
  stage:
    "a theatrical black velvet suit with a frilly white lace jabot blouse and shiny black heels",
  goth: "a long black leather coat over a black lace shirt, silver rings and black platform boots",
  "sharp-suit":
    "a sharp charcoal three-piece suit with a silk tie and polished black oxford shoes",
  street:
    "an oversized graphic hoodie, baggy cargo pants and chunky high-top sneakers",
  everyday:
    "a plain white t-shirt, straight blue jeans and white canvas sneakers",
}

export const headShapeWords: Words = {
  long: "a long narrow head",
  tiny: "a tiny head",
  "high-forehead": "a very high forehead",
  caveman: "a heavy caveman brow",
  chiselled: "a chiselled square superhero jaw",
  "mega-jaw": "a gigantic square mega jaw",
  round: "a perfectly round head",
  square: "a boxy square head",
  heart: "a heart-shaped face",
}

export const neckWords: Words = {
  column: "a thick column neck",
  long: "a long giraffe-like neck",
  short: "almost no neck",
}

export const eyeShapeWords: Words = {
  almond: "almond-shaped",
  round: "round",
  monolid: "monolid",
  "close-set": "close-set",
  "wide-set": "wide-set",
  uneven: "uneven",
  big: "big",
  huge: "huge",
  hooded: "hooded",
  sleepy: "sleepy half-closed",
}

export const eyeColorWords: Words = {
  black: "black",
  brown: "brown",
  hazel: "hazel",
  green: "green",
  blue: "blue",
  "ice-blue": "ice-blue",
  golden: "golden",
  grey: "grey",
}

export const featureWords: Words = {
  freckles: "freckles",
  dimples: "deep dimples",
  "eye-bags": "heavy bags under the eyes",
  blush: "rosy blushed cheeks",
  cheekbones: "very high cheekbones",
  "full-lips": "full lips",
  "thick-brows": "thick bushy eyebrows",
  "beauty-mark": "a beauty mark",
  "potato-nose": "a round potato nose",
  "button-nose": "a tiny button nose",
  "pointy-nose": "a long pointy nose",
  pout: "pouty lips",
  "tiny-mouth": "a tiny pursed mouth",
  "wide-mouth": "a very wide mouth",
  unibrow: "a thick unibrow",
  "thin-brows": "thin high arched eyebrows",
  "jug-ears": "big jug ears",
  "gap-teeth": "a gap between the front teeth",
  "buck-teeth": "big buck teeth",
  "pointy-chin": "a pointy chin",
  "weak-chin": "a weak chin",
  "big-forehead": "a big forehead",
}

export const facialHairWords: Words = {
  stubble: "dark stubble",
  "full-beard": "a full beard",
  goatee: "a pointed goatee",
  moustache: "a thick moustache",
  pencil: "a pencil moustache",
  "push-broom": "a bushy push-broom moustache",
  braided: "a long braided beard",
}

/** A mark with `{their}` where the wearer's pronoun goes. */
export const markWords: Words = {
  "odd-eyes": "one blue eye and one brown eye",
  "face-tattoo": "a small face tattoo under one eye",
  "nose-ring": "a nose ring",
  "ear-piercings": "a row of ear piercings",
  "brow-slits": "two slits shaved into one eyebrow",
  "bleached-brows": "bleached white eyebrows",
  "no-brows": "no eyebrows",
  "gold-grill": "a shiny gold grill on {their} teeth, mouth slightly open",
  braces: "metal braces on {their} teeth",
  "brow-scar": "a scar across one eyebrow",
  "face-gems": "small sparkling gems on the cheeks",
  "elf-ears": "long pointed elf ears",
  "big-lashes": "huge fake eyelashes",
  "nose-tape": "a strip of white tape across the nose",
}

export const accessoryWords: Words = {
  glasses: "tiny round gold glasses",
  headphones: "big white over-ear headphones",
  earrings: "pearl drop earrings",
  hat: "a tiny black bowler hat",
}

export const bagWords = "a small leather bag over one shoulder"

export type Pronoun = { subject: string; verb: string; their: string }

export const pronouns: Readonly<Record<string, Pronoun>> = {
  woman: { subject: "She", verb: "stands", their: "her" },
  man: { subject: "He", verb: "stands", their: "his" },
  any: { subject: "They", verb: "stand", their: "their" },
  androgynous: { subject: "They", verb: "stand", their: "their" },
}
