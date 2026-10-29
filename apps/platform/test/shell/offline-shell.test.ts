import { describe, expect, it, vi } from "vitest"
import { reloadOnNewShell } from "@/offline-shell"

function containerWith(controller: ServiceWorker | null) {
  const events = new EventTarget()
  return {
    controller,
    addEventListener: events.addEventListener.bind(events),
    takeOver: () => events.dispatchEvent(new Event("controllerchange")),
  }
}

describe("a new offline shell", () => {
  it("reloads the page once a new version takes over the one it ran on", () => {
    const container = containerWith({} as ServiceWorker)
    const reload = vi.fn()
    reloadOnNewShell(container, reload)
    expect(reload).not.toHaveBeenCalled()
    container.takeOver()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("leaves the first visit alone when the first shell takes the page", () => {
    const container = containerWith(null)
    const reload = vi.fn()
    reloadOnNewShell(container, reload)
    container.takeOver()
    expect(reload).not.toHaveBeenCalled()
  })
})
