import { findApp } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { fieldsOfModel, runPartsOf } from "@/studio/lipsync/lipsync-run"
import { planOf } from "@/studio/lipsync/lipsync-words"
import { useLipsyncTabs } from "@/studio/lipsync/use-lipsync-tabs"
import {
  audioId,
  avatar,
  catalog,
  ltx,
  photoId,
  valuesOf,
} from "./lipsync-models"

const app: AppListing = appListing.parse(findApp("lipsync"))

function hostedOf(chosen: HostedState["chosen"]): HostedState {
  return {
    isTaskApp: true,
    models: catalog,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: ltx.id,
    chosen,
    fields: chosen?.form ?? null,
    choose: vi.fn(),
  }
}

function partsOf(chosen: HostedState["chosen"], mode: string) {
  const fields = fieldsOfModel(chosen, app)
  return runPartsOf({
    app,
    all: hostedOf(chosen),
    fields,
    tab: "clip",
    plan: planOf("audio", fields),
    voices: [],
    values: valuesOf({ image: [photoId], soundFile: [audioId], mode }),
  })
}

describe("the lip sync tab and a hosted model's mode", () => {
  it("never writes the tab into the inputs a hosted model reads", () => {
    const setInput = vi.fn()
    const form = {
      values: valuesOf({ mode: "std" }),
      setInput,
    } as unknown as AppForm
    const { result } = renderHook(() =>
      useLipsyncTabs(app, hostedOf(avatar), form)
    )
    act(() => {
      result.current.setTab("clip")
      result.current.setTab("photo")
      result.current.choose(avatar.id)
    })
    expect(setInput.mock.calls.filter(([name]) => name === "mode")).toEqual([])
  })

  it("sends the tab to the app's own graph as its mode", () => {
    expect(partsOf(ltx, "std").ask?.inputs.mode).toBe("clip")
  })

  it("sends a hosted model its own default for a choice it does not list", () => {
    expect(partsOf(avatar, "photo").ask?.inputs.mode).toBe("std")
  })

  it("control: sends a hosted model the mode you picked for it", () => {
    expect(partsOf(avatar, "pro").ask?.inputs).toMatchObject({
      model: avatar.id,
      mode: "pro",
    })
  })
})
