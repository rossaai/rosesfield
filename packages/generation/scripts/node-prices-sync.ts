import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import jsonata from "jsonata"

type Setting = string | number | boolean

type Axis = {
  widget: string
  key: string | null
  values: readonly (readonly [Setting, Setting])[]
}

type NodeMap = {
  model: string
  file: string
  node: string
  widgets?: Readonly<Record<string, Setting>>
  axes?: readonly Axis[]
}

type Entry = {
  when: Record<string, Setting>
  low: number
  high: number
  approximate: boolean
}

type Priced = {
  node: string
  source: string
  per: string
  entries: Entry[]
}

const repository = "Comfy-Org/ComfyUI"
const commit = "cdf272f3514353aab04dc2d9fceef57a260dc156"
const readOn = "2026-10-26"
const output = fileURLToPath(
  new URL(
    "../src/infrastructure/router/router-node-prices.gen.ts",
    import.meta.url
  )
)

const same = (values: readonly Setting[]): [Setting, Setting][] =>
  values.map((value) => [value, value])

const seconds = (
  from: number,
  to: number,
  asText = false
): [Setting, Setting][] =>
  Array.from({ length: to - from + 1 }, (_, at) => [
    from + at,
    asText ? String(from + at) : from + at,
  ])

const grokImage = (model: string): NodeMap => ({
  model: `xai/${model}`,
  file: "nodes_grok.py",
  node: "GrokImageNode",
  widgets: { model, number_of_images: 1 },
  axes: [
    { widget: "resolution", key: "resolution", values: same(["1k", "2k"]) },
    {
      widget: "quality",
      key: "quality",
      values: same(["low", "medium", "high"]),
    },
  ],
})

const grokVideo = (model: string): NodeMap => ({
  model: `xai/${model}`,
  file: "nodes_grok.py",
  node: "GrokVideoNode",
  widgets: { model },
  axes: [
    { widget: "duration", key: "duration", values: seconds(1, 15) },
    {
      widget: "resolution",
      key: null,
      values: same(["480p", "720p", "1080p"]),
    },
  ],
})

const speech = (model: string): NodeMap => ({
  model: `elevenlabs/${model}`,
  file: "nodes_elevenlabs.py",
  node: "ElevenLabsTextToSpeech",
  widgets: { model },
})

const fixed = (model: string, file: string, node: string): NodeMap => ({
  model,
  file,
  node,
})

const flux2 = (model: string, name: string): NodeMap => ({
  model: `bfl/${model}`,
  file: "nodes_bfl.py",
  node: "Flux2ImageNode",
  widgets: { model: name },
  axes: [
    {
      widget: "model.width",
      key: "width",
      values: same([512, 768, 1024, 1536, 2048]),
    },
    {
      widget: "model.height",
      key: "height",
      values: same([512, 768, 1024, 1536, 2048]),
    },
  ],
})

/**
 * Each hosted model a Comfy partner node runs, with the node's settings that
 * name the model and the settings its price reads, each paired with the
 * value the model's own form sends for it.
 */
const mapped: readonly NodeMap[] = [
  fixed("bfl/flux-pro-1.1-ultra", "nodes_bfl.py", "FluxProUltraImageNode"),
  fixed("bfl/flux-pro-1.0-expand", "nodes_bfl.py", "FluxProExpandNode"),
  fixed("bfl/flux-pro-1.0-fill", "nodes_bfl.py", "FluxProFillNode"),
  fixed("bfl/erase-v1", "nodes_bfl.py", "FluxEraseNode"),
  fixed("bfl/vto-v1", "nodes_bfl.py", "FluxVTONode"),
  flux2("flux-2-pro", "flux.2 [pro]"),
  flux2("flux-2-max", "flux.2 [max]"),
  {
    model: "bfl/flux-3-image",
    file: "nodes_bfl.py",
    node: "Flux3ImageNode",
    axes: [
      {
        widget: "resolution",
        key: "resolution",
        values: [
          ["0.75k", "768sq"],
          ["1k", "1k"],
          ["1.5k", "1.5k"],
          ["2k", "2k"],
          ["4k", "4k"],
        ],
      },
    ],
  },
  fixed("bria/image", "nodes_bria.py", "BriaImageGenerate"),
  fixed(
    "bria/image-edit-product-holding",
    "nodes_bria.py",
    "BriaProductHolding"
  ),
  fixed(
    "bria/image-edit-product-virtual-tryon",
    "nodes_bria.py",
    "BriaVirtualTryOn"
  ),
  fixed(
    "bria/image-edit-remove-background-guided",
    "nodes_bria.py",
    "BriaGuidedRemoveBackground"
  ),
  grokImage("grok-imagine-image"),
  grokImage("grok-imagine-image-2.0"),
  grokImage("grok-imagine-image-pro"),
  grokImage("grok-imagine-image-quality"),
  grokVideo("grok-imagine-video"),
  grokVideo("grok-imagine-video-1.5"),
  grokVideo("grok-imagine-video-1.5-lite"),
  grokVideo("grok-imagine-video-1.5-preview"),
  speech("eleven_multilingual_v2"),
  speech("eleven_v3"),
  speech("eleven_v4"),
  speech("eleven_v4_turbo"),
  {
    model: "freepik/ai-image-upscaler-precision-v2",
    file: "nodes_magnific.py",
    node: "MagnificImageUpscalerPreciseV2Node",
    axes: [
      {
        widget: "scale_factor",
        key: "scalefactor",
        values: [
          ["2x", 2],
          ["4x", 4],
          ["8x", 8],
          ["16x", 16],
        ],
      },
    ],
  },
  {
    model: "ideogram/p-image-ideogram",
    file: "nodes_ideogram.py",
    node: "IdeogramPImage",
    axes: [
      {
        widget: "quality",
        key: "quality",
        values: [
          ["very_low", "VERY_LOW"],
          ["low", "LOW"],
          ["medium", "MEDIUM"],
          ["high", "HIGH"],
        ],
      },
      {
        widget: "resolution",
        key: "resolution",
        values: [
          ["1k", "1K"],
          ["2k", "2K"],
        ],
      },
    ],
  },
  {
    model: "kling/kling-v2-6",
    file: "nodes_kling.py",
    node: "KlingTextToVideoWithAudio",
    axes: [
      { widget: "duration", key: "duration", values: seconds(3, 15, true) },
      {
        widget: "generate_audio",
        key: "sound",
        values: [
          [true, "on"],
          [false, "off"],
        ],
      },
    ],
  },
]

const suffixUnits: readonly [RegExp, string][] = [
  [/^\/(s|sec|second)$/i, "second"],
  [/^\/minute$/i, "minute"],
  [/^\/1K chars$/i, "thousand-characters"],
  [/^(\/image.*)?$/i, "run"],
]

function usdOf(usd: number): number {
  return Math.round(usd * 1e6) / 1e6
}

function sourceUrl(file: string, line: number): string {
  return `https://github.com/${repository}/blob/${commit}/comfy_api_nodes/${file}#L${line}`
}

async function readFile(file: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${repository}/${commit}/comfy_api_nodes/${file}`
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}`)
  }
  return response.text()
}

function literalAt(text: string, at: number): string | null {
  const rest = text.slice(at)
  const triple = /^("""|''')([\s\S]*?)\1/.exec(rest)
  if (triple !== null) {
    return triple[2] ?? null
  }
  const single = /^(["'])((?:(?!\1)[^\\]|\\.)*)\1/.exec(rest)
  if (single !== null) {
    return (single[2] ?? "").replace(/\\(.)/g, "$1")
  }
  const name = /^(?:cls\.)?([A-Z_][A-Z0-9_]*)/.exec(rest)
  if (name === null) {
    return null
  }
  const defined = new RegExp(`\\b${name[1]}\\s*=\\s*`).exec(text)
  return defined === null
    ? null
    : literalAt(text, defined.index + defined[0].length)
}

function badgeOf(text: string, node: string): { expr: string; line: number } {
  const at = text.indexOf(`node_id="${node}"`)
  if (at < 0) {
    throw new Error(`${node} is not in the file`)
  }
  const next = text.indexOf("node_id=", at + 8)
  const badge = text.indexOf("price_badge=", at)
  const expr = text.indexOf("expr=", badge)
  if (badge < 0 || expr < 0 || (next >= 0 && expr > next)) {
    throw new Error(`${node} publishes no price badge`)
  }
  const found = literalAt(text, expr + 5)
  if (found === null) {
    throw new Error(
      `${node} builds its price badge in code this script does not read`
    )
  }
  return { expr: found, line: text.slice(0, badge).split("\n").length }
}

function combinationsOf(
  axes: readonly Axis[]
): [Axis, readonly [Setting, Setting]][][] {
  let combos: [Axis, readonly [Setting, Setting]][][] = [[]]
  for (const axis of axes) {
    combos = combos.flatMap((combo) =>
      axis.values.map((value) => [
        ...combo,
        [axis, value] as [Axis, readonly [Setting, Setting]],
      ])
    )
  }
  return combos
}

function widgetsOf(map: NodeMap, combo: [Axis, readonly [Setting, Setting]][]) {
  const widgets: Record<string, Setting> = { ...map.widgets }
  for (const [axis, [node]] of combo) {
    widgets[axis.widget] = node
  }
  return widgets
}

async function priceOf(
  map: NodeMap,
  expr: string
): Promise<{ per: string; entries: Entry[] }> {
  const compiled = jsonata(expr)
  const entries: Entry[] = []
  let per: string | null = null
  for (const combo of combinationsOf(map.axes ?? [])) {
    const badge = await compiled.evaluate({
      widgets: widgetsOf(map, combo),
      inputs: { image: { connected: false } },
      inputGroups: { "model.images": 0 },
    })
    const type = badge?.type
    const low =
      type === "usd" ? badge.usd : type === "range_usd" ? badge.min_usd : null
    const high =
      type === "usd" ? badge.usd : type === "range_usd" ? badge.max_usd : null
    if (
      typeof low !== "number" ||
      typeof high !== "number" ||
      !Number.isFinite(low)
    ) {
      throw new Error(
        `${map.node} gave no price for ${JSON.stringify(widgetsOf(map, combo))}`
      )
    }
    const suffix = String(badge?.format?.suffix ?? "")
    const unit = suffixUnits.find(([pattern]) => pattern.test(suffix))?.[1]
    if (unit === undefined || (per !== null && per !== unit)) {
      throw new Error(
        `${map.node} prices per "${suffix}", which this table does not convert`
      )
    }
    per = unit
    const when: Record<string, Setting> = {}
    for (const [axis, [, form]] of combo) {
      if (axis.key !== null) {
        when[axis.key] = form
      }
    }
    entries.push({
      when,
      low: usdOf(low),
      high: usdOf(high),
      approximate: badge?.format?.approximate === true,
    })
  }
  return { per: per ?? "run", entries }
}

async function main(): Promise<void> {
  const files = new Map<string, string>()
  const models: Record<string, Priced> = {}
  for (const map of mapped) {
    const text = files.get(map.file) ?? (await readFile(map.file))
    files.set(map.file, text)
    const { expr, line } = badgeOf(text, map.node)
    const { per, entries } = await priceOf(map, expr)
    models[map.model] = {
      node: map.node,
      source: sourceUrl(map.file, line),
      per,
      entries,
    }
  }
  const table = { repository, commit, readOn, models }
  writeFileSync(
    output,
    `// Written by packages/generation/scripts/node-prices-sync.ts from the price badge each Comfy partner node publishes. Do not edit.\n\nexport const nodePrices = ${JSON.stringify(table, null, 2)} as const\n`
  )
  console.log(
    `${Object.keys(models).length} models priced from ${repository}@${commit}`
  )
}

await main()
