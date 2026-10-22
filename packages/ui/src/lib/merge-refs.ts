import type { Ref, RefCallback } from "react"

function attach<T>(ref: Ref<T> | undefined, node: T): () => void {
  if (typeof ref === "function") {
    const cleanup = ref(node)
    return typeof cleanup === "function" ? cleanup : () => ref(null)
  }
  if (ref !== null && ref !== undefined) {
    ref.current = node
    return () => {
      ref.current = null
    }
  }
  return () => undefined
}

export function mergeRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (node) => {
    if (node === null) {
      return
    }
    const cleanups = refs.map((ref) => attach(ref, node))
    return () => {
      for (const cleanup of cleanups) {
        cleanup()
      }
    }
  }
}
