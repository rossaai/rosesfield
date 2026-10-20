import type { ReactNode } from "react"
import type { GalleryKey } from "@/gallery/copy.en"

export type GalleryForce = "hover" | "press" | "focus"

export type GalleryState = {
  id: string
  label: GalleryKey
  placement?: "inline" | "layer" | "screen" | "frame"
  width?: "pair" | "full"
  force?: GalleryForce
  render: () => ReactNode
}

export type GalleryEntry = {
  id: string
  title: GalleryKey
  unit?: string
  states: GalleryState[]
}
