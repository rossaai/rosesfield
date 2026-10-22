import type { AppListing } from "@rosesfield/contract"
import { useEffect, useState } from "react"
import type { FieldProblem } from "@/screens/app/app-form"
import { listOf } from "@/screens/app/fields/field-props"
import type { AppForm } from "@/screens/app/use-app-form"
import { recordingLengthProblem, recordingOf } from "@/studio/audio/audio-modes"
import { useMediaFacts } from "@/studio/lipsync/use-media-facts"

type Held = { tab: string; problem: FieldProblem }

export function useLengthProblem(
  app: AppListing,
  tab: string,
  form: AppForm
): FieldProblem | undefined {
  const name = recordingOf(app, tab)
  const [first = null] = listOf(
    name === null ? undefined : form.values.inputs[name]
  )
  const reading = useMediaFacts(first, "audio")
  const seconds = reading.state === "read" ? reading.facts.seconds : null
  const [held, setHeld] = useState<Held | null>(null)
  const { setInput } = form
  useEffect(() => {
    if (name === null || first === null || seconds === null) {
      return
    }
    const found = recordingLengthProblem(tab, name, seconds)
    setHeld(found === null ? null : { tab, problem: found })
    if (found !== null) {
      setInput(name, [])
    }
  }, [name, first, seconds, tab, setInput])
  return held?.tab === tab ? held.problem : undefined
}
