import { useEffect, useRef, useState } from "react"
import type { AppForm } from "@/screens/app/use-app-form"
import type { StartRun } from "@/screens/app/use-start-run"

export function useCheckedStart(
  start: StartRun,
  form: AppForm,
  isReady: boolean,
  onRefused: () => void
): StartRun {
  const [isWaiting, setWaiting] = useState(false)
  const run = (): void => {
    if (!form.validate()) {
      onRefused()
      return
    }
    start.generate()
  }
  const latestRun = useRef(run)
  latestRun.current = run
  useEffect(() => {
    if (isWaiting && isReady) {
      setWaiting(false)
      latestRun.current()
    }
  }, [isWaiting, isReady])
  return {
    ...start,
    isPending: start.isPending || isWaiting,
    generate: () => {
      if (start.isPending || isWaiting) {
        return
      }
      if (isReady) {
        run()
      } else {
        setWaiting(true)
      }
    },
  }
}
