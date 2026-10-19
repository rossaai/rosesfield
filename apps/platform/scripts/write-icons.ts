import { readFileSync } from "node:fs"
import { chromium } from "@playwright/test"
import { shellCopy } from "../src/copy/shell.en"

type IconSpec = {
  file: string
  size: number
  letterShare: number
}

const platformRoot = new URL("..", import.meta.url)
const tokens = readFileSync(
  new URL("../../packages/ui/src/tokens.css", platformRoot),
  "utf8"
)
const font = readFileSync(
  new URL(
    "node_modules/@fontsource/montserrat/files/montserrat-latin-500-normal.woff2",
    platformRoot
  )
).toString("base64")

function lightValue(token: string): string {
  const match = new RegExp(
    `--${token}: var\\(--if-light, (#[0-9a-f]+)\\)`
  ).exec(tokens)
  if (match?.[1] === undefined) {
    throw new Error(`tokens.css holds no light value for --${token}`)
  }
  return match[1]
}

const specs: readonly IconSpec[] = [
  { file: "icon-any-192.png", size: 192, letterShare: 0.62 },
  { file: "icon-any-512.png", size: 512, letterShare: 0.62 },
  { file: "icon-maskable-512.png", size: 512, letterShare: 0.42 },
  { file: "apple-touch-icon.png", size: 180, letterShare: 0.58 },
  { file: "favicon-32.png", size: 32, letterShare: 0.78 },
]

function pageOf(spec: IconSpec): string {
  const mark = shellCopy["shell.name"].slice(0, 1)
  return `<!doctype html><html><head><style>
    @font-face { font-family: Mark; font-weight: 500; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    html, body { margin: 0; }
    body { width: ${spec.size}px; height: ${spec.size}px; display: grid; place-items: center;
      background: ${lightValue("canvas")}; color: ${lightValue("ink")};
      font: 500 ${Math.round(spec.size * spec.letterShare)}px/1 Mark; letter-spacing: -0.05em; }
  </style></head><body><span>${mark}</span></body></html>`
}

const browser = await chromium.launch()
for (const spec of specs) {
  const page = await browser.newPage({
    viewport: { width: spec.size, height: spec.size },
  })
  await page.setContent(pageOf(spec))
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: new URL(`public/icons/${spec.file}`, platformRoot).pathname,
  })
  await page.close()
}
await browser.close()
