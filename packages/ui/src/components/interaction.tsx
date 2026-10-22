import { motion } from "@rosesfield/ui/motion"

const fill =
  "hover:bg-(--tint) in-data-[gallery=hover]:bg-(--tint) in-data-[gallery=press]:bg-(--tint)"

const ring =
  "focus-visible:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-hor-text in-data-[gallery=focus]:outline-solid"

const ringHost =
  "outline-hor-text has-[>[data-cover]:focus-visible]:outline-(length:--spacing-focus-ring) has-[>[data-cover]:focus-visible]:outline-solid has-[>[data-cover]:focus-visible]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-solid"

const fieldRing =
  "focus-visible:outline-(length:--spacing-focus-ring) focus-visible:outline-solid focus-visible:outline-hor-text focus-visible:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-hor-text in-data-[gallery=focus]:outline-solid"

const fieldHostRing =
  "outline-hor-text has-[textarea:focus-visible]:outline-(length:--spacing-focus-ring) has-[textarea:focus-visible]:outline-offset-(--spacing-focus-ring) has-[textarea:focus-visible]:outline-solid"

const thumbRing =
  "outline-hor-text has-[:focus-visible]:outline-(length:--spacing-focus-ring) has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-solid"

const cover = "focus-visible:outline-none"

const ringRoom =
  "-m-[calc(var(--spacing-focus-ring)*2)] p-[calc(var(--spacing-focus-ring)*2)]"

const ringRoomBlock =
  "-my-[calc(var(--spacing-focus-ring)*2)] py-[calc(var(--spacing-focus-ring)*2)]"

const ringRoomTop =
  "-mt-[calc(var(--spacing-focus-ring)*2)] pt-[calc(var(--spacing-focus-ring)*2)]"

const ringScroll =
  "scroll-p-[calc(var(--spacing-focus-ring)*2)] scroll-pb-[calc(var(--spacing-focus-ring)*2+var(--covered-bottom,0px))]"

const reveal = `opacity-0 group-hover/reveal:opacity-100 group-focus-within/reveal:opacity-100 in-data-[gallery=hover]:opacity-100 in-data-[gallery=focus]:opacity-100 ${motion.tint}`

const revealPointer =
  "pointer-events-none group-hover/reveal:pointer-events-auto group-focus-within/reveal:pointer-events-auto in-data-[gallery=hover]:pointer-events-auto in-data-[gallery=focus]:pointer-events-auto"

export const interaction = {
  fill,
  ring,
  fieldRing,
  fieldHostRing,
  thumbRing,
  ringHost,
  cover,
  ringRoom,
  ringRoomBlock,
  ringRoomTop,
  ringScroll,
  reveal,
  revealPointer,
} as const
