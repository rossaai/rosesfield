import type { AppListing } from "@rosesfield/contract"
import { useEffect } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import { useMediaFacts } from "@/studio/motion/use-media-facts"
import {
  type ReadClip,
  readClipOf,
  readingProblemOf,
} from "@/studio/recast/recast-checks"
import { sourceInput } from "@/studio/recast/recast-modes"
import { nearestRatio } from "@/studio/recast/use-clip-facts"

export type RecastClip = {
  clip: ReadClip | null
  clipProblem: FieldProblem | undefined
  isRead: boolean
}

export function useRecastClip(
  form: Pick<AppForm, "values" | "setForm">,
  app: AppListing
): RecastClip {
  const [first = null] = listOf(form.values.inputs[sourceInput])
  const reading = useMediaFacts(first, "video")
  const clipProblem = readingProblemOf(reading)
  const clip =
    reading.state === "read" && clipProblem === undefined
      ? readClipOf(reading.facts)
      : null
  const { setForm } = form
  const options =
    app.output.kind === "video" ? app.output.aspectRatios.options : []
  const ratio = clip === null ? null : nearestRatio(clip, options)
  const current = form.values.aspectRatio
  useEffect(() => {
    if (ratio !== null && ratio !== current) {
      setForm({ aspectRatio: ratio })
    }
  }, [current, ratio, setForm])
  const isRatioSet = ratio === null || ratio === current
  return {
    clip,
    clipProblem,
    isRead: reading.state !== "reading" && isRatioSet,
  }
}
