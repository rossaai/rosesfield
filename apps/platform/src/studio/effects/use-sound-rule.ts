import { type AppListing, whenHolds } from "@rosesfield/contract"
import { useEffect } from "react"
import type { AppForm } from "@/screens/app/use-app-form"

const soundInput = "sound"

export function useSoundRule(app: AppListing, form: AppForm): boolean {
  const input = app.inputs.find((one) => one.name === soundInput)
  const sound = input?.type === "toggle" ? input : null
  const applies = sound !== null && whenHolds(sound.when, form.values.inputs)
  const value = form.values.inputs[soundInput]
  const { setInput } = form
  useEffect(() => {
    if (sound === null) {
      return
    }
    if (!applies && value !== undefined) {
      setInput(soundInput, undefined)
    }
    if (applies && value === undefined) {
      setInput(soundInput, sound.default)
    }
  }, [sound, applies, value, setInput])
  return applies
}
