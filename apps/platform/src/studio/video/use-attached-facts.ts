import type { AppListing } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { assetQuery } from "@/api/queries"
import { formatSeconds } from "@/copy/format"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf, numberOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  clipName,
  lengthName,
  startFrameName,
} from "@/studio/video/video-rules"
import {
  longestClipSeconds,
  nearestRatio,
  shortestClipSeconds,
  useClipFacts,
} from "@/studio/video-edit/use-clip-facts"

type Size = { width: number; height: number }

export type ClipCheck =
  | { kind: "fits"; length: number }
  | { kind: "refused"; problem: FieldProblem }

export function clipCheckOf(seconds: number): ClipCheck {
  const whole = Math.floor(seconds)
  const shown = formatSeconds(seconds)
  if (seconds < shortestClipSeconds) {
    return {
      kind: "refused",
      problem: {
        name: clipName,
        key: "field.asset.tooShort",
        values: { seconds: shown, min: shortestClipSeconds },
      },
    }
  }
  if (whole > longestClipSeconds) {
    return {
      kind: "refused",
      problem: {
        name: clipName,
        key: "field.asset.tooLong",
        values: { seconds: shown, max: longestClipSeconds },
      },
    }
  }
  return { kind: "fits", length: whole }
}

function aspectOptions(app: AppListing): readonly string[] {
  return app.output.kind === "video" ? app.output.aspectRatios.options : []
}

function useImageSize(assetId: string | null): Size | null {
  const found = useQuery({
    ...assetQuery(assetId ?? ""),
    enabled: assetId !== null,
  })
  const asset = found.data?.asset
  return asset?.width != null && asset.height != null
    ? { width: asset.width, height: asset.height }
    : null
}

export function useAttachedFacts(
  app: AppListing,
  form: AppForm
): FieldProblem | undefined {
  const { inputs } = form.values
  const { setInput, setForm } = form
  const [clipId = null] = listOf(inputs[clipName])
  const [frameId = null] = listOf(inputs[startFrameName])
  const clip = useClipFacts(clipId)
  const frame = useImageSize(frameId)
  const [problem, setProblem] = useState<FieldProblem | undefined>()
  const shaped = useRef<string | null>(null)
  const length = numberOf(inputs[lengthName], 0)

  useEffect(() => {
    if (clip === null) {
      return
    }
    const check = clipCheckOf(clip.seconds)
    if (check.kind === "refused") {
      setProblem(check.problem)
      setInput(clipName, [])
      return
    }
    setProblem(undefined)
    if (check.length !== length) {
      setInput(lengthName, check.length)
    }
  }, [clip, length, setInput])

  const size = clip ?? frame
  const shapeId = clip === null ? frameId : clipId
  useEffect(() => {
    if (size === null || shapeId === null || shaped.current === shapeId) {
      return
    }
    shaped.current = shapeId
    const ratio = nearestRatio(size, aspectOptions(app))
    if (ratio !== null) {
      setForm({ aspectRatio: ratio })
    }
  }, [app, setForm, shapeId, size])

  return clipId === null ? problem : undefined
}
