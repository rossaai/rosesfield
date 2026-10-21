import { useRouterState } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import type { FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"
import type { AppSeeds } from "@/screens/app/use-app-screen"

const keptEntries = 20

const kept = new Map<string, FormValues>()

export function keepForm(entry: string, values: FormValues): void {
  kept.delete(entry)
  kept.set(entry, values)
  for (const old of kept.keys()) {
    if (kept.size <= keptEntries) {
      return
    }
    kept.delete(old)
  }
}

export function keptFormOf(entry: string): FormValues | null {
  return kept.get(entry) ?? null
}

function hasSeeds(seeds: AppSeeds): boolean {
  return (
    seeds.use !== undefined ||
    seeds.from !== undefined ||
    seeds.share !== undefined
  )
}

export function useKeptForm(form: AppForm, seeds: AppSeeds): void {
  const location = useRouterState({ select: (state) => state.location })
  const entry = location.state.__TSR_key ?? location.state.key ?? null
  const isSeeded = hasSeeds(seeds) || location.state.draft !== undefined
  const [restore] = useState(() =>
    entry === null || isSeeded ? null : keptFormOf(entry)
  )
  const isRestored = useRef(false)
  const { fill, values } = form
  useEffect(() => {
    if (restore !== null && !isRestored.current) {
      isRestored.current = true
      fill(restore)
    }
  }, [restore, fill])
  useEffect(() => {
    if (entry !== null) {
      keepForm(entry, values)
    }
  }, [entry, values])
}
