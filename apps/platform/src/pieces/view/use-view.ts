import type { ViewLayout } from "@rosesfield/ui/components/view-menu"
import { useState } from "react"
import { z } from "zod"
import { tileSizes, tileStepIndexOf } from "@/pieces/view/tile-scale"

export type { ViewLayout }

export type ViewPlace = "app" | "library" | "history" | "explore"

const viewChoice = z.object({
  layout: z.enum(["list", "grid"]),
  size: z.number().int().min(tileSizes.min).max(tileSizes.max),
})

export type ViewChoice = z.infer<typeof viewChoice>

export const viewStart: ViewChoice = { layout: "grid", size: tileSizes.start }

export type SearchWords = {
  words: string
  setWords: (words: string) => void
}

export type PlaceView = ViewChoice &
  SearchWords & {
    setLayout: (layout: ViewLayout) => void
    setSize: (size: number) => void
  }

const held = new Map<ViewPlace, ViewChoice>()

function storageKeyOf(place: ViewPlace): string {
  return `rosesfield.view.${place}`
}

export function parseViewChoice(stored: string | null): ViewChoice | null {
  if (stored === null) {
    return null
  }
  try {
    const parsed = viewChoice.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function readViewChoice(place: ViewPlace): ViewChoice {
  try {
    const stored = window.localStorage.getItem(storageKeyOf(place))
    return parseViewChoice(stored) ?? viewStart
  } catch {
    return held.get(place) ?? viewStart
  }
}

export function keepViewChoice(place: ViewPlace, choice: ViewChoice): void {
  try {
    window.localStorage.setItem(storageKeyOf(place), JSON.stringify(choice))
  } catch {
    held.set(place, choice)
  }
}

export function useView(place: ViewPlace, kept?: SearchWords): PlaceView {
  const [choice, setChoice] = useState(() => readViewChoice(place))
  const [words, setWords] = useState("")
  const choose = (next: ViewChoice): void => {
    setChoice(next)
    keepViewChoice(place, next)
  }
  return {
    ...choice,
    setLayout: (layout) => choose({ ...choice, layout }),
    setSize: (size) => choose({ ...choice, size: tileStepIndexOf(size) }),
    ...(kept ?? { words, setWords }),
  }
}
