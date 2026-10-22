import { growScaleOf, isOnScreen } from "@rosesfield/ui/hooks/use-grow-from"
import { type RefCallback, useCallback } from "react"

type Box = { left: number; top: number; width: number; height: number }

const pressable =
  "button, a[href], [role='button'], [role='menuitem'], [role='tab'], [role='option']"

let pressed: HTMLElement | null = null

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      pressed =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(pressable)
          : null
    },
    true
  )
}

export function originPoseOf(from: Box, to: Box): string {
  const scale = growScaleOf(from, to)
  const x = from.left + from.width / 2 - (to.left + to.width / 2)
  const y = from.top + from.height / 2 - (to.top + to.height / 2)
  return `translate(${x}px, ${y}px) scale(${scale})`
}

function openerOf(layer: HTMLElement): HTMLElement | null {
  const focused = document.activeElement
  if (
    focused instanceof HTMLElement &&
    focused !== document.body &&
    !layer.contains(focused)
  ) {
    return focused
  }
  const last = pressed
  if (last === null || !last.isConnected || layer.contains(last)) {
    return null
  }
  return last
}

function restBoxOf(layer: HTMLElement): Box {
  layer.style.transition = "none"
  layer.style.transform = "none"
  const box = layer.getBoundingClientRect()
  layer.style.removeProperty("transform")
  return box
}

function placeAt(layer: HTMLElement, opener: HTMLElement, rest: Box): void {
  const from = opener.getBoundingClientRect()
  if (!opener.isConnected || !isOnScreen(from)) {
    layer.style.removeProperty("--layer-origin")
    return
  }
  layer.style.setProperty("--layer-origin", originPoseOf(from, rest))
}

export function useLayerOrigin(): RefCallback<HTMLElement> {
  return useCallback<RefCallback<HTMLElement>>((layer) => {
    if (layer === null) {
      return
    }
    const opener = openerOf(layer)
    if (opener === null) {
      return
    }
    const rest = restBoxOf(layer)
    placeAt(layer, opener, rest)
    void layer.getBoundingClientRect()
    layer.style.removeProperty("transition")
    const closing = new MutationObserver(() => {
      if (layer.hasAttribute("data-ending-style")) {
        placeAt(layer, opener, rest)
      }
    })
    closing.observe(layer, {
      attributes: true,
      attributeFilter: ["data-ending-style"],
    })
    return () => closing.disconnect()
  }, [])
}
