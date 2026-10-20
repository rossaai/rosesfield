const light =
  "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-current after:opacity-0 after:transition-opacity after:duration-(--duration-press) hover:after:opacity-10 active:after:opacity-15 in-data-[gallery=hover]:after:opacity-10 in-data-[gallery=press]:after:opacity-15"

const fill =
  "transition-colors duration-(--duration-press) hover:bg-(--tint) in-data-[gallery=hover]:bg-(--tint) in-data-[gallery=press]:bg-(--tint)"

const ring =
  "in-data-[gallery=focus]:outline-(length:--spacing-focus-ring) in-data-[gallery=focus]:outline-offset-(--spacing-focus-ring) in-data-[gallery=focus]:outline-hor-text in-data-[gallery=focus]:outline-solid"

const reveal =
  "opacity-0 transition-opacity duration-(--duration-control) group-hover/reveal:opacity-100 group-focus-within/reveal:opacity-100 in-data-[gallery=hover]:opacity-100 in-data-[gallery=focus]:opacity-100"

export const interaction = { light, fill, ring, reveal } as const
