import type { AppListing } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { useRouterState } from "@tanstack/react-router"
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  defaultsOf,
  type FieldProblem,
  type FieldValue,
  type FormValues,
  problemsOf,
} from "@/screens/app/app-form"
import {
  fillFromDraft,
  fillFromRun,
  fillFromShare,
  placeAll,
} from "@/screens/app/form-fill"

export type FormSource = "defaults" | "seed"

export type AppForm = {
  values: FormValues
  source?: FormSource
  problems: ReadonlyMap<string, FieldProblem>
  setInput: (name: string, value: FieldValue) => void
  setForm: (change: Partial<FormValues>) => void
  fill: (values: FormValues) => void
  validate: () => boolean
  register: (name: string, focus: () => void) => void
}

type FormSeeds = {
  use: string | undefined
  from: string | undefined
  share?: string | undefined
}

function useSeededValues(
  app: AppListing,
  seeds: FormSeeds
): [FormValues, Dispatch<SetStateAction<FormValues>>, FormSource] {
  const [values, setValues] = useState<FormValues>(() => defaultsOf(app))
  const [source, setSource] = useState<FormSource>("defaults")
  const client = useQueryClient()
  const draft = useRouterState({
    select: (state) => state.location.state.draft,
  })
  const seeded = useRef(false)
  useEffect(() => {
    if (seeded.current) {
      return
    }
    seeded.current = true
    const base = defaultsOf(app)
    const fill = async (): Promise<void> => {
      const fromRun =
        seeds.from === undefined
          ? seeds.share === undefined
            ? null
            : await fillFromShare(client, app, seeds.share)
          : await fillFromRun(client, app, seeds.from)
      let next = fromRun ?? base
      if (draft !== undefined) {
        next = await fillFromDraft(client, app, next, draft)
      }
      if (seeds.use !== undefined) {
        next = await placeAll(client, app, next, [seeds.use])
      }
      setValues(next)
      if (fromRun !== null) {
        setSource("seed")
      }
    }
    void fill()
  }, [app, client, draft, seeds.from, seeds.use, seeds.share])
  return [values, setValues, source]
}

export type FormCheck = (values: FormValues) => FieldProblem[]

export function useAppForm(
  app: AppListing,
  seeds: FormSeeds,
  check?: RefObject<FormCheck | null>
): AppForm {
  const [values, setValues, source] = useSeededValues(app, seeds)
  const [problems, setProblems] = useState<ReadonlyMap<string, FieldProblem>>(
    new Map()
  )
  const focusers = useRef(new Map<string, () => void>())
  const setInput = useCallback(
    (name: string, value: FieldValue) => {
      setValues((current) => ({
        ...current,
        inputs: { ...current.inputs, [name]: value },
      }))
      setProblems((current) => {
        if (!current.has(name)) {
          return current
        }
        const next = new Map(current)
        next.delete(name)
        return next
      })
    },
    [setValues]
  )
  const validate = useCallback((): boolean => {
    const found = check?.current?.(values) ?? problemsOf(app, values)
    setProblems(new Map(found.map((problem) => [problem.name, problem])))
    const first = found[0]
    if (first !== undefined) {
      focusers.current.get(first.name)?.()
    }
    return found.length === 0
  }, [app, values, check])
  return {
    values,
    source,
    problems,
    setInput,
    setForm: (change) => setValues((current) => ({ ...current, ...change })),
    fill: (next) => {
      setValues(next)
      setProblems(new Map())
    },
    validate,
    register: (name, focus) => {
      focusers.current.set(name, focus)
    },
  }
}
