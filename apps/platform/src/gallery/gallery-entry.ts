import type { ReactNode } from "react"
import type { GalleryKey } from "@/gallery/copy.en"

export type GalleryState = {
  id: string
  label: GalleryKey
  placement?: "inline" | "layer" | "screen"
  width?: "pair" | "full"
  render: () => ReactNode
}

export type GalleryEntry = {
  id: string
  title: GalleryKey
  states: GalleryState[]
}
