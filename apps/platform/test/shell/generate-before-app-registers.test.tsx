import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import {
  type ComponentType,
  type LazyExoticComponent,
  lazy,
  type ReactElement,
} from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { StudioSuspense } from "@/screens/app/studio-suspense"
import { ToolsKey } from "@/screens/app/tools-key"
import { BottomBar } from "@/shell/bottom-bar"
import { renderAt } from "./shell-router"

afterEach(cleanup)

type Studio = LazyExoticComponent<ComponentType>

function loadingStudio(screen: () => ReactElement | null): {
  Studio: Studio
  load: () => Promise<void>
} {
  let finish: () => void = () => undefined
  const loaded = new Promise<void>((resolve) => {
    finish = resolve
  })
  const Studio = lazy(async () => {
    await loaded
    return { default: screen }
  })
  const load = async (): Promise<void> => {
    await act(async () => {
      finish()
      await loaded
    })
  }
  return { Studio, load }
}

async function appPage(Studio: Studio): Promise<HTMLElement> {
  renderAt("/apps/lipsync", () => (
    <>
      <BottomBar />
      <StudioSuspense>
        <Studio />
      </StudioSuspense>
    </>
  ))
  return screen.findByRole("navigation", { name: "Main" })
}

function pressGenerate(bar: HTMLElement): void {
  fireEvent.click(within(bar).getByRole("button", { name: "Generate" }))
}

describe("Generate on an app page whose screen is still loading", () => {
  it("opens that app's Inputs once its screen registers, not the list of apps", async () => {
    const openInputs = vi.fn()
    const { Studio, load } = loadingStudio(() => (
      <ToolsKey onOpen={openInputs} />
    ))
    const bar = await appPage(Studio)
    pressGenerate(bar)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(openInputs).not.toHaveBeenCalled()
    await load()
    expect(openInputs).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("control: opens the app's Inputs when pressed after its screen registered", async () => {
    const openInputs = vi.fn()
    const { Studio, load } = loadingStudio(() => (
      <ToolsKey onOpen={openInputs} />
    ))
    const bar = await appPage(Studio)
    await load()
    pressGenerate(bar)
    expect(openInputs).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the list of apps once a screen with no Inputs sheet loads", async () => {
    const { Studio, load } = loadingStudio(() => null)
    const bar = await appPage(Studio)
    pressGenerate(bar)
    expect(screen.queryByRole("dialog")).toBeNull()
    await load()
    expect(await screen.findByRole("dialog")).toBeTruthy()
  })

  it("forgets the press once the person leaves the app before it loads", async () => {
    const left = loadingStudio(() => null)
    pressGenerate(await appPage(left.Studio))
    cleanup()
    await left.load()
    const openInputs = vi.fn()
    const next = loadingStudio(() => <ToolsKey onOpen={openInputs} />)
    await appPage(next.Studio)
    await next.load()
    expect(openInputs).not.toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})
