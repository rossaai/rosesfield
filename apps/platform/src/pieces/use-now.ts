import { useEffect, useState } from "react"

export function useNow(isTicking: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isTicking) {
      return
    }
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), everyMs)
    return () => window.clearInterval(timer)
  }, [isTicking, everyMs])
  return now
}
