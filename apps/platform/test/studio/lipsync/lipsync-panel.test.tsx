import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatDuration } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import type { FieldValue } from "@/screens/app/app-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { LipsyncModeTabs, LipsyncPanel } from "@/studio/lipsync/lipsync-panel"
import { fieldsOfModel } from "@/studio/lipsync/lipsync-run"
import { faceOf } from "@/studio/lipsync/lipsync-tabs"
import {
  modesOf,
  planOf,
  type WordsMode,
  wordsLabelKey,
} from "@/studio/lipsync/lipsync-words"
import type { LipsyncScreen } from "@/studio/lipsync/use-lipsync-screen"
import {
  audioId,
  avatar,
  catalog,
  ltx,
  photoApp,
  speech,
  valuesOf,
} from "./lipsync-models"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function hostedOf(
  models: readonly CatalogModel[],
  chosen: CatalogModel | null
): HostedState {
  return {
    isTaskApp: true,
    models,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: models[0]?.id ?? null,
    chosen,
    fields: chosen?.form ?? null,
    choose: () => undefined,
  }
}

function screenOf(options: {
  model: CatalogModel
  mode: WordsMode
  inputs?: Record<string, FieldValue>
  seconds?: number | null
  setWords?: (mode: WordsMode) => void
}): LipsyncScreen {
  const fields = fieldsOfModel(options.model, photoApp)
  return {
    app: photoApp,
    bodyApp: photoApp,
    form: {
      values: valuesOf(options.inputs ?? {}),
      problems: new Map(),
      setInput: () => undefined,
      setForm: () => undefined,
      fill: () => undefined,
      validate: () => true,
      register: () => undefined,
    },
    start: {
      generate: () => undefined,
      isPending: false,
      error: null,
      price: "",
    },
    tab: "photo",
    setTab: () => undefined,
    plan: planOf(options.mode, fields),
    modes: modesOf(fields),
    setWords: options.setWords ?? (() => undefined),
    fields,
    face: faceOf(fields, "photo"),
    isGraph: options.model.kind === "graph",
    hosted: hostedOf(catalog.slice(0, 4), options.model),
    voices: hostedOf([speech], speech),
    wellProblems: {},
    audio:
      options.seconds === undefined || options.seconds === null
        ? null
        : {
            mime: "audio/mpeg",
            bytes: 80_000,
            width: null,
            height: null,
            seconds: options.seconds,
          },
    lastSeed: null,
    useInputs: () => undefined,
    registerWell: () => undefined,
    onShortcut: () => undefined,
  }
}

function show(node: ReactElement): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>
  )
}

describe("the Lip sync column", () => {
  it("shows the two tabs, From a photo and From a clip", () => {
    show(<LipsyncModeTabs screen={{ tab: "photo", setTab: () => undefined }} />)
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      tCatalog("lipsync.choice.mode.photo"),
      tCatalog("lipsync.choice.mode.clip"),
    ])
  })

  it("shows the Face well, the Words switch between Audio and Text and the model row", () => {
    show(<LipsyncPanel screen={screenOf({ model: ltx, mode: "audio" })} />)
    expect(
      screen.getByText(tCatalog("lipsync.input.photo.label"))
    ).not.toBeNull()
    const words = screen.getByRole("radiogroup", {
      name: tCatalog(wordsLabelKey),
    })
    expect(
      Array.from(words.querySelectorAll("[role='radio']")).map(
        (one) => one.textContent
      )
    ).toEqual([t("kind.audio"), t("kind.text")])
    expect(
      screen.getByRole("button", { name: new RegExp(t("model.picker.title")) })
    ).not.toBeNull()
  })

  it("shows the audio you added with its name, its length and a play button", () => {
    show(
      <LipsyncPanel
        screen={screenOf({
          model: ltx,
          mode: "audio",
          inputs: { audio: [audioId] },
          seconds: 5,
        })}
      />
    )
    const held = document.querySelector("[data-slot='lipsync-audio']")
    expect(held?.textContent).toContain(t("output.upload.audio"))
    expect(held?.textContent).toContain(formatDuration(5))
    expect(
      screen.getByRole("button", { name: t("output.play") })
    ).not.toBeNull()
  })

  it("names the chosen model's length limit in the audio well's tip", async () => {
    show(<LipsyncPanel screen={screenOf({ model: ltx, mode: "audio" })} />)
    const limit = t("field.limits.length", { min: 2, max: 10 })
    expect(document.body.textContent).not.toContain(limit)
    const zone = screen.getByRole("button", {
      name: t("field.asset.add.audio"),
    })
    fireEvent.pointerEnter(zone, { pointerType: "mouse" })
    fireEvent.mouseEnter(zone)
    fireEvent.focus(zone)
    expect(
      await screen.findByText(new RegExp(limit), {}, { timeout: 3000 })
    ).not.toBeNull()
  })

  it("on Text shows a box for your line and a voice from the speech models", () => {
    show(<LipsyncPanel screen={screenOf({ model: avatar, mode: "text" })} />)
    const label = tCatalog("voice.input.script.label")
    expect(screen.getByRole("textbox", { name: label })).not.toBeNull()
    const voice = document.querySelector("[data-slot='lipsync-voice']")
    expect(voice?.textContent).toContain(speech.name)
  })

  it("switches to Text when you choose it", () => {
    const setWords = vi.fn()
    const one = screenOf({ model: ltx, mode: "audio", setWords })
    show(<LipsyncPanel screen={one} />)
    fireEvent.click(screen.getByRole("radio", { name: t("kind.text") }))
    expect(setWords).toHaveBeenCalledWith("text")
  })
})
