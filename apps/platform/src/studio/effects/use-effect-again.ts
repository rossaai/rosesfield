import type { Run } from "@rosesfield/contract"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AppForm } from "@/screens/app/use-app-form"

const effectInput = "effect"
const photoInput = "image"
const focusWindowMs = 2000

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

type PendingFocus = { name: string; askedAt: number }

function useDeferredFocus(register: AppForm["register"]): {
  capture: AppForm["register"]
  ask: (name: string) => void
} {
  const focusers = useRef(new Map<string, () => void>())
  const pending = useRef<PendingFocus | null>(null)
  const [asked, setAsked] = useState(0)
  const focusPending = useCallback(() => {
    const found = pending.current
    if (found === null) {
      return
    }
    if (performance.now() - found.askedAt > focusWindowMs) {
      pending.current = null
      return
    }
    const before = document.activeElement
    focusers.current.get(found.name)?.()
    if (document.activeElement !== before) {
      pending.current = null
    }
  }, [])
  const capture = useCallback(
    (name: string, focus: () => void) => {
      focusers.current.set(name, focus)
      register(name, focus)
      if (pending.current?.name === name) {
        requestAnimationFrame(focusPending)
      }
    },
    [register, focusPending]
  )
  useEffect(() => {
    if (asked > 0) {
      focusPending()
    }
  }, [asked, focusPending])
  return {
    capture,
    ask: (name) => {
      pending.current = { name, askedAt: performance.now() }
      setAsked((count) => count + 1)
    },
  }
}

export function useEffectAgain(options: EffectAgainOptions): EffectAgain {
  const { form, fill, openInputs, onNewPhoto } = options
  const focus = useDeferredFocus(form.register)
  const { capture } = focus
  const wrapped = useMemo(
    () => ({ ...form, register: capture }),
    [form, capture]
  )
  return {
    form: wrapped,
    onAnotherPhoto: (run) => {
      fill(run)
      form.setForm({ seedMode: "random" })
      form.setInput(photoInput, [])
      onNewPhoto()
      openInputs()
      focus.ask(photoInput)
    },
    onAnotherEffect: (run) => {
      fill(run)
      form.setForm({ seedMode: "random" })
      openInputs()
      focus.ask(effectInput)
    },
  }
}
