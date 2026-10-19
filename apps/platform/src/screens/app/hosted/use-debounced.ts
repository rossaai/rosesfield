import { useEffect, useState } from "react"

export function useDebounced<Value>(value: Value, delayMs: number): Value {
  const [held, setHeld] = useState(value)
  const key = JSON.stringify(value)
  useEffect(() => {
    const timer = setTimeout(() => setHeld(JSON.parse(key)), delayMs)
    return () => clearTimeout(timer)
  }, [key, delayMs])
  return held
}
