export type TryOnPart = "all" | "top" | "bottom"

const keepPerson =
  "Keep the face, hair, skin, body shape, pose and hands of the person in image 1 unchanged, and keep the background of image 1 unchanged."

const sameClothes =
  "with the same colors, cut, pattern, print and text as in image 2."

export const tryOnPrompts: Readonly<Record<TryOnPart, string>> = {
  all: [
    `Dress the person in image 1 in every piece of clothing shown in image 2, ${sameClothes}`,
    "Remove the clothes the person wears in image 1 wherever the clothes from image 2 cover the body.",
    keepPerson,
  ].join(" "),
  top: [
    `Replace only the top the person in image 1 wears, such as a shirt, a jacket or a sweater, with the top shown in image 2, ${sameClothes}`,
    "Keep the trousers, skirt or shorts the person wears in image 1 unchanged.",
    keepPerson,
  ].join(" "),
  bottom: [
    `Replace only the trousers, skirt or shorts the person in image 1 wears with the bottom shown in image 2, ${sameClothes}`,
    "Keep the shirt, jacket or sweater the person wears in image 1 unchanged.",
    keepPerson,
  ].join(" "),
}
