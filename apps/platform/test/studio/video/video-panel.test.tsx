import { findApp } from "@rosesfield/catalog"
import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { appListing } from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { t, tCatalog } from "@/copy/t"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import type { VideoScreen } from "@/studio/video/use-video-screen"
import { SoundChip, VideoSettings } from "@/studio/video/video-chips"
import { videoFieldsOf } from "@/studio/video/video-fields"
import { ModeTabs, VideoPanel } from "@/studio/video/video-panel"
import { fieldsOfModel } from "@/studio/video/video-tabs"
import { showColumn } from "../column"
import { seedanceFast } from "./video-forms"

beforeEach(() => {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const video = appListing.parse(findApp("video"))

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

describe("the prompt's chip row", () => {
  it("holds Sound as a 26 px chip", () => {
    render(
      <TooltipProvider>
        <SoundChip form={form} fields={null} isGraph makesSound={false} />
      </TooltipProvider>
    )
    const chip = screen.getByRole("button", { pressed: true })
    expect(chip.className.split(" ")).toContain("h-button-small")
  })
})

describe("the column's settings", () => {
  it("draw a model's resolution and length as dropdowns in the plan's order, the seed closed under Advanced, and a setting the table does not know nowhere", () => {
    const fields = videoFieldsOf([
      {
        kind: "choice",
        name: "resolution",
        path: "resolution",
        required: false,
        options: ["720p", "1080p"],
        default: "720p",
      },
      {
        kind: "choice",
        name: "duration",
        path: "duration",
        required: false,
        options: [5, 10],
        default: 5,
      },
      {
        kind: "toggle",
        name: "fancyKnob",
        path: "fancyKnob",
        required: false,
        default: false,
      },
      {
        kind: "number",
        name: "seed",
        path: "seed",
        required: false,
        min: 0,
        max: 100,
        integer: true,
        default: null,
      },
    ])
    render(
      <TooltipProvider>
        <VideoSettings
          app={video}
          form={form}
          fields={fields}
          lastSeed={null}
          placed={[]}
        />
      </TooltipProvider>
    )
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(
      screen
        .getAllByRole("combobox")
        .map((one) => one.getAttribute("aria-label"))
    ).toEqual([
      tCatalog("model.field.resolution"),
      tCatalog("model.field.duration"),
    ])
    expect(screen.queryByRole("switch")).toBeNull()
    expect(
      screen.getByRole("button", { name: t("field.advanced") })
    ).toBeTruthy()
    expect(document.querySelector("[data-slot='setting-tiles']")).toBeNull()
  })
})

describe("Video's one mode row", () => {
  it("names its tabs Image, References and Two frames, short enough to fit the column", () => {
    render(<ModeTabs screen={{ tab: "text-image", setTab: () => undefined }} />)
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      t("shell.area.image"),
      tCatalog("video.tab.references"),
      tCatalog("video.tab.firstLast"),
    ])
  })
})

function screenOf(chosen: CatalogModel | null): VideoScreen {
  const hosted: HostedState = {
    isTaskApp: true,
    models: chosen === null ? [] : [chosen],
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: chosen?.id ?? null,
    chosen,
    fields: chosen?.form ?? null,
    choose: () => undefined,
  }
  return {
    state: {
      form,
      start: {
        generate: () => undefined,
        isPending: false,
        error: null,
        price: "",
      },
      hosted,
      lastSeed: null,
      hasRuns: false,
      useInputs: () => undefined,
      onShortcut: () => undefined,
    },
    hosted,
    tab: "references",
    setTab: () => undefined,
    fields: fieldsOfModel(chosen),
    isGraph: chosen === null,
    presets: [],
    prompt: {
      name: "prompt",
      typed: "",
      move: null,
      setTyped: () => undefined,
      setMove: () => undefined,
    },
    fillFromRun: () => undefined,
  }
}

const seedance: CatalogModel = {
  id: "byteplus/seedance-fast",
  kind: "hosted",
  maker: "Maker",
  name: "Seedance",
  nameKey: null,
  task: "reference-to-video",
  tags: [{ kind: "sound" }],
  form: [...seedanceFast],
}

describe("Video's column", () => {
  it("holds no switch that opens Video edit and no Sound or Elements chip in the prompt, on a graph and on a hosted model with references and sound", () => {
    for (const chosen of [null, seedance]) {
      showColumn(<VideoPanel app={video} screen={screenOf(chosen)} />)
      expect(document.querySelector("[data-slot='make-switch']")).toBeNull()
      expect(
        screen.queryByRole("radiogroup", {
          name: tCatalog("videoEdit.input.mode.label"),
        })
      ).toBeNull()
      expect(
        screen.queryByRole("button", {
          name: tCatalog("video.input.sound.label"),
        })
      ).toBeNull()
      expect(
        screen.queryByRole("button", { name: t("bar.elements") })
      ).toBeNull()
      cleanup()
    }
  })
})
