import { readFileSync } from "node:fs"
import { chromium } from "@playwright/test"

type IconSpec = {
  file: string
  size: number
}

const platformRoot = new URL("..", import.meta.url)
const tokens = readFileSync(
  new URL("../../packages/ui/src/tokens.css", platformRoot),
  "utf8"
)
const logo = readFileSync(
  new URL("../../brand/rosesfield-icon-light.svg", platformRoot)
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
  { file: "icon-any-192.png", size: 192 },
  { file: "icon-any-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
]

function pageOf(spec: IconSpec): string {
  return `<!doctype html><html><head><style>
    html, body { margin: 0; }
    body { width: ${spec.size}px; height: ${spec.size}px; background: ${lightValue("canvas")}; }
    img { display: block; width: 100%; height: 100%; }
  </style></head><body><img alt="" src="data:image/svg+xml;base64,${logo}"></body></html>`
}

const browser = await chromium.launch()
for (const spec of specs) {
  const page = await browser.newPage({
    viewport: { width: spec.size, height: spec.size },
  })
  await page.setContent(pageOf(spec))
  await page
    .locator("img")
    .evaluate((img) => (img as HTMLImageElement).decode())
  await page.screenshot({
    path: new URL(`public/icons/${spec.file}`, platformRoot).pathname,
  })
  await page.close()
}
await browser.close()
