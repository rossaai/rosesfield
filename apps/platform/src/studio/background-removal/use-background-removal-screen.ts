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
  canStartWith,
  type ImageCheck,
  type ImageProblem,
  imageCheckOf,
  nearestRatioOf,
} from "@/studio/background-removal/image-limits"
import { useImageFacts } from "@/studio/background-removal/use-image-facts"

export const imageInput = "image"
export const backgroundInput = "background"
export const modelInput = "model"

export type BackgroundRemovalState = {
  app: AppListing
  form: AppForm
  start: StartRun
  refusal: string | null
  check: ImageCheck
  registerWell: (focus: () => void) => void
  hasRuns: boolean | null
  setImage: (ids: string[]) => void
  useInputs: (run: Run) => void
  onShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

export function messageOf(problem: ImageProblem): string {
  switch (problem.kind) {
    case "wrongKind":
      return t("field.asset.wrongKind", {
        kinds: tCatalog("backgroundRemoval.input.image.kinds"),
      })
    case "tooLarge":
      return t("field.asset.tooLarge", {
        size: formatBytes(problem.bytes),
        limit: formatBytes(problem.limit),
      })
    case "tooBig":
      return tCatalog("backgroundRemoval.input.image.tooBig", {
        width: problem.width,
        height: problem.height,
        max: problem.max,
      })
    case "tooSmall":
      return tCatalog("backgroundRemoval.input.image.tooSmall", {
        width: problem.width,
        height: problem.height,
        min: problem.min,
      })
  }
}

export function waitMessageOf(check: ImageCheck): string | null {
  switch (check.state) {
    case "pending":
      return tCatalog("backgroundRemoval.input.image.reading")
    case "unreadable":
      return tCatalog("backgroundRemoval.input.image.unreadable")
    default:
      return null
  }
}

function ratioOptionsOf(app: AppListing): readonly string[] {
  return app.output.kind === "image" ? app.output.aspectRatios.options : []
}

function useRefusal(
  form: AppForm,
  assetId: string | null,
  message: string | null
): [string | null, (next: string | null) => void] {
  const [refusal, setRefusal] = useState<string | null>(null)
  const { setInput } = form
  useEffect(() => {
    if (assetId === null || message === null) {
      return
    }
    setRefusal(message)
    setInput(imageInput, [])
  }, [assetId, message, setInput])
  return [refusal, setRefusal]
}

function useRatioFromImage(form: AppForm, ratio: string | null): void {
  const { setForm } = form
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
}

export function useBackgroundRemovalScreen(
  app: AppListing,
  seeds: StudioScreenProps["seeds"],
  onStarted: () => void
): BackgroundRemovalState {
  const form = useAppForm(app, seeds)
  const [assetId = null] = listOf(form.values.inputs[imageInput])
  const check = imageCheckOf(useImageFacts(assetId))
  const [refusal, setRefusal] = useRefusal(
    form,
    assetId,
    check.state === "refused" ? messageOf(check.problem) : null
  )
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (check.state !== "pending") {
      setHeld(false)
    }
  }, [check.state])
  useRatioFromImage(
    form,
    check.state === "valid"
      ? nearestRatioOf(ratioOptionsOf(app), check.size)
      : null
  )
  const focusWell = useRef<() => void>(() => undefined)
  const registerWell = useCallback((focus: () => void) => {
    focusWell.current = focus
  }, [])
  const base = useStartRun(app, form, onStarted)
  const generate = (): void => {
    if (!canStartWith(check)) {
      setHeld(true)
      focusWell.current()
      return
    }
    base.generate()
  }
  const runs = useAppRuns(app)
  const waiting =
    check.state === "pending" && !held ? null : waitMessageOf(check)
  return {
    app,
    form,
    start: { ...base, generate },
    refusal: refusal ?? waiting,
    check,
    registerWell,
    hasRuns: runs.isPending ? null : runs.runs.length > 0,
    setImage: (ids) => {
      setRefusal(null)
      form.setInput(imageInput, ids)
    },
    useInputs: (run) => {
      setRefusal(null)
      form.fill(valuesFromRun(app, run))
    },
    onShortcut: (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        generate()
      }
    },
  }
}
