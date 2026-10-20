import { creditsOfCost, nameOf } from "@rosesfield/catalog/comfy"
import type { ShareView } from "@rosesfield/contract"
import { posterSizeOf } from "#share/share-posters"
import { shareCopy } from "#share/share.en"

export type PageSource = () => Promise<string | null>

export type PagedShare = {
  view: ShareView
  poster: string | null
}

type Head = {
  title: string
  description: string
  image: string | null
  video: {
    url: string
    mime: string
    width: number | null
    height: number | null
  } | null
  width: number | null
  height: number | null
}

const marks: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (mark) => marks[mark] ?? mark)
}

export function modelNameOf(view: ShareView): string | null {
  const chosen = view.run.inputs.model
  if (typeof chosen === "string" && chosen !== "" && chosen !== "auto") {
    return nameOf(chosen.includes("/") ? chosen : `graph/${chosen}`)
  }
  const [file] = view.run.engine.models
  return file === undefined ? null : file.replace(/\.[a-z0-9]+$/i, "")
}

export function creditsLine(view: ShareView): string | null {
  const { cost } = view.run
  return cost === null
    ? null
    : shareCopy.credits(Math.round(creditsOfCost(cost) * 100) / 100)
}

function absolute(origin: string, path: string): string {
  return new URL(path, origin).href
}

function imageOf(share: PagedShare): {
  path: string | null
  width: number | null
  height: number | null
} {
  const first = share.view.media[0]
  if (first?.kind === "image") {
    return {
      path: `${share.view.path}/media/0`,
      width: first.width,
      height: first.height,
    }
  }
  if (first?.kind === "video" && share.poster !== null) {
    return { path: share.poster, ...posterSizeOf(first.width, first.height) }
  }
  return { path: null, width: null, height: null }
}

function headOf(share: PagedShare, origin: string): Head {
  const { view } = share
  const first = view.media[0]
  const mediaPath = `${view.path}/media/0`
  const image = imageOf(share)
  const facts = [modelNameOf(view), creditsLine(view)].filter(
    (part): part is string => part !== null
  )
  return {
    title: shareCopy.title,
    description: facts.join(", "),
    image: image.path === null ? null : absolute(origin, image.path),
    video:
      first?.kind === "video"
        ? {
            url: absolute(origin, mediaPath),
            mime: first.mime,
            width: first.width,
            height: first.height,
          }
        : null,
    width: image.width,
    height: image.height,
  }
}

function meta(property: string, content: string | number | null): string {
  if (content === null) {
    return ""
  }
  const name = property.startsWith("twitter:") ? "name" : "property"
  return `<meta ${name}="${property}" content="${escapeHtml(String(content))}" />`
}

function headTags(head: Head, url: string): string {
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    meta("og:type", head.video === null ? "website" : "video.other"),
    meta("og:site_name", shareCopy.lockup),
    meta("og:title", head.title),
    meta("og:description", head.description),
    meta("og:url", url),
    meta("og:image", head.image),
    meta("og:image:width", head.image === null ? null : head.width),
    meta("og:image:height", head.image === null ? null : head.height),
    meta("og:video", head.video?.url ?? null),
    meta("og:video:secure_url", head.video?.url ?? null),
    meta("og:video:type", head.video?.mime ?? null),
    meta("og:video:width", head.video?.width ?? null),
    meta("og:video:height", head.video?.height ?? null),
    meta(
      "twitter:card",
      head.image === null ? "summary" : "summary_large_image"
    ),
    meta("twitter:title", head.title),
    meta("twitter:description", head.description),
    meta("twitter:image", head.image),
    head.image === null
      ? ""
      : `<link rel="preload" as="image" href="${escapeHtml(head.image)}" fetchpriority="high" />`,
  ].join("")
}

function ratioOf(view: ShareView): string {
  const first = view.media[0]
  if (first?.width != null && first.height != null) {
    return `${first.width}/${first.height}`
  }
  return view.run.aspectRatio?.replace(":", "/") ?? "auto"
}

function mediaMarkup(share: PagedShare, eager: boolean): string {
  const { view } = share
  const first = view.media[0]
  if (first === undefined) {
    return ""
  }
  const src = `${view.path}/media/0`
  if (first.kind === "audio") {
    return `<audio src="${escapeHtml(src)}" controls preload="metadata" style="width:100%"></audio>`
  }
  const frame = `margin:0;position:relative;display:block;overflow:hidden;width:100%;aspect-ratio:${ratioOf(view)};border-radius:var(--radius-cell);background:var(--surface)`
  const fill = "display:block;width:100%;height:100%;object-fit:contain"
  if (first.kind === "video") {
    const poster =
      share.poster === null ? "" : ` poster="${escapeHtml(share.poster)}"`
    return `<figure style="${frame}"><video src="${escapeHtml(src)}"${poster} muted loop playsinline autoplay preload="metadata" style="${fill}"></video></figure>`
  }
  const loading = eager ? ` fetchpriority="high"` : ` loading="lazy"`
  return `<figure style="${frame}"><img src="${escapeHtml(src)}" alt=""${loading} decoding="async" style="${fill}" /></figure>`
}

function lockupMarkup(): string {
  return `<picture><source srcset="/lockup-dark.svg" media="(prefers-color-scheme: dark)" /><img src="/lockup-light.svg" alt="${escapeHtml(shareCopy.lockup)}" width="122" height="32" /></picture>`
}

function shareMarkup(share: PagedShare): string {
  const { view } = share
  const facts = [modelNameOf(view), creditsLine(view)]
    .filter((part): part is string => part !== null)
    .map((part) => escapeHtml(part))
    .join(", ")
  const recreate = `/apps/${encodeURIComponent(view.run.appId)}?share=${encodeURIComponent(view.id)}`
  return [
    `<div style="min-height:100dvh;background:var(--canvas);color:var(--ink);display:flex;flex-direction:column;align-items:center;gap:var(--spacing-s6);padding:var(--spacing-s5) var(--spacing-s4)">`,
    `<header style="width:100%;max-width:var(--spacing-prompt-max)">${lockupMarkup()}</header>`,
    `<main style="width:100%;max-width:var(--spacing-prompt-max);display:flex;flex-direction:column;gap:var(--spacing-s3)">`,
    mediaMarkup(share, true),
    `<p style="color:var(--ink-muted)">${facts}</p>`,
    `<p><a href="${escapeHtml(recreate)}" style="display:inline-flex;align-items:center;height:var(--spacing-button);padding:0 var(--spacing-s5);border-radius:var(--radius-full);background:var(--ink);color:var(--canvas);font-weight:500;text-decoration:none">${escapeHtml(shareCopy.recreate)}</a></p>`,
    "</main></div>",
  ].join("")
}

function exploreMarkup(shares: readonly PagedShare[]): string {
  const tiles = shares
    .map(
      (share) =>
        `<a href="${escapeHtml(share.view.path)}" style="display:block;margin-bottom:var(--spacing-s2);break-inside:avoid">${mediaMarkup(share, false)}</a>`
    )
    .join("")
  return [
    `<div style="min-height:100dvh;background:var(--canvas);color:var(--ink);padding:var(--spacing-s5)">`,
    `<header style="display:flex;flex-direction:column;gap:var(--spacing-s1);margin-bottom:var(--spacing-s4)">${lockupMarkup()}<h1>${escapeHtml(shareCopy.exploreTitle)}</h1><p style="color:var(--ink-muted)">${escapeHtml(shareCopy.exploreLine)}</p></header>`,
    `<div style="columns:2;column-gap:var(--spacing-s2)">${tiles}</div>`,
    "</div>",
  ].join("")
}

function inject(html: string, head: string, body: string): string {
  return html
    .replace(/<title>[^<]*<\/title>/, () => "")
    .replace(/<meta name="description"[^>]*>/, () => "")
    .replace("</head>", () => `${head}</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
}

const moduleScript =
  /<script type="module" crossorigin src="([^"]+)"><\/script>/
const modulePreload = /<link rel="modulepreload"[^>]*>/g

export function afterLoad(html: string): string {
  const entry = moduleScript.exec(html)?.[1]
  if (entry === undefined) {
    return html
  }
  const boot = `<script>addEventListener("load",()=>{const s=document.createElement("script");s.type="module";s.src=${JSON.stringify(entry)};document.head.append(s)})</script>`
  return html.replace(moduleScript, () => boot).replace(modulePreload, () => "")
}

export const shareDataId = "rosesfield-share"

function dataTag(view: ShareView): string {
  const json = JSON.stringify({ share: view }).replace(/</g, "\\u003c")
  return `<script id="${shareDataId}" type="application/json">${json}</script>`
}

export function sharePage(
  html: string,
  share: PagedShare,
  url: string
): string {
  const origin = new URL(url).origin
  const head = `${headTags(headOf(share, origin), url)}${dataTag(share.view)}`
  return afterLoad(inject(html, head, shareMarkup(share)))
}

export function explorePage(
  html: string,
  shares: readonly PagedShare[],
  url: string
): string {
  const first = shares[0]
  const head =
    first === undefined
      ? ""
      : headTags(
          { ...headOf(first, new URL(url).origin), title: shareCopy.lockup },
          url
        )
  return shares.length === 0 ? html : inject(html, head, exploreMarkup(shares))
}
