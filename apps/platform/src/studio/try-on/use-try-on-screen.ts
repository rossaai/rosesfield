import type { AppListing, Run } from "@rosesfield/contract"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { formatBytes } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { useAppRuns } from "@/screens/app/app-canvas"
import { valuesFromRun } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppForm, useAppForm } from "@/screens/app/use-app-form"
import { type StartRun, useStartRun } from "@/screens/app/use-start-run"
import {
  nearestRatioOf,
  type PhotoName,
  type PhotoProblem,
  type PhotoReading,
  photoNames,
  readingProblemOf,
  sizeOf,
} from "@/studio/try-on/try-on-limits"
import { usePhotoFacts } from "@/studio/try-on/use-photo-facts"

export type TryOnState = {
  app: AppListing
  form: AppForm
  start: StartRun
  messages: Readonly<Record<PhotoName, string | null>>
  lastSeed: number | null
  hasRuns: boolean | null
  registerWell: (name: PhotoName, focus: () => void) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function messageOf(name: PhotoName, problem: PhotoProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog("try-on.input.photo.kinds"),
      })
    case "unreadable":
      return tCatalog(`try-on.input.${name}.unreadable`)
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooSmall":
      return tCatalog(`try-on.input.${name}.tooSmall`, {
        side: problem.side,
        min: problem.min,
      })
    case "badRatio":
      return tCatalog("try-on.input.person.badRatio", { max: problem.max })
  }
}

function useRatioFromPerson(form: AppForm, ratio: string | null): void {
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
}

export type Well = {
  empty: boolean
  reading: PhotoReading
}

export function ratioFromPerson(
  options: readonly string[],
  person: PhotoReading
): string | null {
  if (person.state !== "read" || readingProblemOf("person", person) !== null) {
    return null
  }
  const size = sizeOf(person.facts)
  return size === null ? null : nearestRatioOf(options, size)
}

export function wellToFocusOf(
  wells: Readonly<Record<PhotoName, Well>>
): PhotoName | null {
  const held = photoNames.find((name) => {
    const well = wells[name]
    return (
      well.empty ||
      well.reading.state === "reading" ||
      readingProblemOf(name, well.reading) !== null
    )
  })
  return held ?? null
}

function useWells(form: AppForm): Readonly<Record<PhotoName, Well>> {
  const [personId = null] = listOf(form.values.inputs.person)
  const [clothesId = null] = listOf(form.values.inputs.clothes)
  const person = usePhotoFacts(personId)
  const clothes = usePhotoFacts(clothesId)
  return {
    person: { empty: personId === null, reading: person },
    clothes: { empty: clothesId === null, reading: clothes },
  }
}

function useWellFocus(
  form: AppForm
): [(name: PhotoName) => void, (name: PhotoName, focus: () => void) => void] {
  const focusers = useRef(new Map<PhotoName, () => void>())
  const registerForm = useRef(form.register)
  registerForm.current = form.register
  const registerWell = useCallback((name: PhotoName, focus: () => void) => {
    focusers.current.set(name, focus)
    registerForm.current(name, focus)
  }, [])
  return [(name) => focusers.current.get(name)?.(), registerWell]
}

export function useTryOnScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): TryOnState {
  const form = useAppForm(app, seeds)
  const wells = useWells(form)
  const options =
    app.output.kind === "image" ? app.output.aspectRatios.options : []
  useRatioFromPerson(form, ratioFromPerson(options, wells.person.reading))
  const base = useStartRun(app, form, onStarted)
  const runs = useAppRuns(app)
  const [missing, setMissing] = useState<ReadonlySet<PhotoName>>(new Set())
  const [focusWell, registerWell] = useWellFocus(form)
  const generate = (): void => {
    setMissing(new Set(photoNames.filter((name) => wells[name].empty)))
    const held = wellToFocusOf(wells)
    if (held !== null) {
      focusWell(held)
      return
    }
    base.generate()
  }
  const messageFor = (name: PhotoName): string | null => {
    const well = wells[name]
    const problem = readingProblemOf(name, well.reading)
    if (problem !== null) {
      return messageOf(name, problem)
    }
    return missing.has(name) && well.empty
      ? tCatalog(`try-on.input.${name}.required`)
      : null
  }
  return {
    app,
    form,
    start: { ...base, generate },
    messages: { person: messageFor("person"), clothes: messageFor("clothes") },
    lastSeed: runs.runs.find((run) => run.seed !== null)?.seed ?? null,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    registerWell,
    useInputs: (run) => form.fill(valuesFromRun(app, run)),
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
