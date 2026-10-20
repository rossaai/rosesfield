const overlay =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0 after:transition-opacity after:duration-(--duration-press)"

const light = `${overlay} hover:after:opacity-10 active:after:opacity-10 in-data-[gallery=hover]:after:opacity-10 in-data-[gallery=press]:after:opacity-10`

const lightPress = `${overlay} hover:after:opacity-10 active:after:opacity-20 in-data-[gallery=hover]:after:opacity-10 in-data-[gallery=press]:after:opacity-20`

const fill =
  "transition-colors duration-(--duration-press) hover:bg-(--tint) in-data-[gallery=hover]:bg-(--tint) in-data-[gallery=press]:bg-(--tint)"

const ring =
  "focus-visible:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-hor-text in-data-[gallery=focus]:outline-solid"

const ringHost =
  "outline-hor-text has-[>[data-cover]:focus-visible]:outline-(length:--spacing-focus-ring) has-[>[data-cover]:focus-visible]:outline-solid has-[>[data-cover]:focus-visible]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-solid"

const cover = "focus-visible:outline-none"

const ringRoom =
  "-m-[calc(var(--spacing-focus-ring)*2)] p-[calc(var(--spacing-focus-ring)*2)]"

const ringRoomBlock =
  "-my-[calc(var(--spacing-focus-ring)*2)] py-[calc(var(--spacing-focus-ring)*2)]"

const ringScroll = "scroll-p-[calc(var(--spacing-focus-ring)*2)]"

const reveal =
  "opacity-0 transition-opacity duration-(--duration-control) motion-reduce:transition-none group-hover/reveal:opacity-100 group-focus-within/reveal:opacity-100 in-data-[gallery=hover]:opacity-100 in-data-[gallery=focus]:opacity-100"

const revealPointer =
  "pointer-events-none group-hover/reveal:pointer-events-auto group-focus-within/reveal:pointer-events-auto in-data-[gallery=hover]:pointer-events-auto in-data-[gallery=focus]:pointer-events-auto"

export const interaction = {
  light,
  lightPress,
  fill,
  ring,
  ringHost,
  cover,
  ringRoom,
  ringRoomBlock,
  ringScroll,
  reveal,
  revealPointer,
} as const
