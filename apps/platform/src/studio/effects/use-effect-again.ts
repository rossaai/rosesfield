import type { Run } from "@rosesfield/contract"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AppForm } from "@/screens/app/use-app-form"

const effectInput = "effect"
const photoInput = "image"

type EffectAgainOptions = {
  form: AppForm
  fill: (run: Run) => void
  openInputs: () => void
  onNewPhoto: () => void
}

export type EffectAgain = {
  form: AppForm
  onAnotherPhoto: (run: Run) => void
  onAnotherEffect: (run: Run) => void
}

export function useEffectAgain(options: EffectAgainOptions): EffectAgain {
  const { form, fill, openInputs, onNewPhoto } = options
  const focusers = useRef(new Map<string, () => void>())
  const [pending, setPending] = useState<string | null>(null)
  const { register } = form
  const capture = useCallback(
    (name: string, focus: () => void) => {
      focusers.current.set(name, focus)
      register(name, focus)
    },
    [register]
  )
  const wrapped = useMemo(
    () => ({ ...form, register: capture }),
    [form, capture]
  )
  useEffect(() => {
    if (pending === null) {
      return
    }
    setPending(null)
    focusers.current.get(pending)?.()
  }, [pending])
  return {
    form: wrapped,
    onAnotherPhoto: (run) => {
      fill(run)
      form.setForm({ seedMode: "random" })
      form.setInput(photoInput, [])
      onNewPhoto()
      openInputs()
      setPending(photoInput)
    },
    onAnotherEffect: (run) => {
      fill(run)
      form.setForm({ seedMode: "random" })
      openInputs()
      setPending(effectInput)
    },
  }
}
