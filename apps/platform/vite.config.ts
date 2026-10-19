import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { shellCopy } from "./src/copy/shell.en"

const platformPackage: unknown = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
)
const tokens = readFileSync(
  new URL("../../packages/ui/src/tokens.css", import.meta.url),
  "utf8"
)

const unreleased = "0.0.0"

function versionOf(value: unknown, commit: string): string {
  const version =
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    typeof value.version === "string"
      ? value.version
      : unreleased
  return version === unreleased ? commit : version
}

function commitOf(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
}

function schemeValue(token: string, scheme: "light" | "dark"): string {
  const match = new RegExp(
    `--${token}: var\\(--if-light, (#[0-9a-f]+)\\) var\\(--if-dark, (#[0-9a-f]+)\\)`
  ).exec(tokens)
  return (scheme === "light" ? match?.[1] : match?.[2]) ?? "#ffffff"
}

const pageValues: Readonly<Record<string, string>> = {
  "canvas-light": schemeValue("canvas", "light"),
  "canvas-dark": schemeValue("canvas", "dark"),
  "shell-name": shellCopy["shell.name"],
  "shell-description": shellCopy["shell.description"],
}

const pageCopy: Plugin = {
  name: "rosesfield-page-copy",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(
        /%([a-z-]+)%/g,
        (match: string, name: string) => pageValues[name] ?? match
      ),
  },
}

const gateway = process.env.ROSESFIELD_GATEWAY ?? "http://127.0.0.1:8787"
const icon = (size: number, purpose: "any" | "maskable") => ({
  src: `/icons/icon-${purpose}-${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
  purpose,
})

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(versionOf(platformPackage, commitOf())),
    __LANDING_PAGE__: JSON.stringify(process.env.ROSESFIELD_LANDING === "1"),
  },
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      generatedRouteTree: "./src/route-tree.gen.ts",
    }),
    react(),
    tailwindcss(),
    pageCopy,
    VitePWA({
      injectRegister: false,
      registerType: "autoUpdate",
      filename: "sw.js",
      includeAssets: ["icons/favicon-32.png", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: shellCopy["shell.name"],
        short_name: shellCopy["shell.name"],
        description: shellCopy["shell.description"],
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: schemeValue("canvas", "light"),
        theme_color: schemeValue("canvas", "light"),
        icons: [icon(192, "any"), icon(512, "any"), icon(512, "maskable")],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/mcp/],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
  },
  server: {
    proxy: {
      "/api": { target: gateway },
      "/mcp": { target: gateway },
    },
  },
})
