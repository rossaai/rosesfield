import { creditsOfCost, nameOf } from "@rosesfield/catalog/comfy"
import type { ShareView } from "#share/share.contract"
import { shareCopy } from "#share/share.en"

export type PageSource = () => Promise<string | null>

type Head = {
  title: string
  description: string
  image: string | null
  video: string | null
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

function headOf(view: ShareView, origin: string): Head {
  const first = view.media[0]
  const mediaPath = `${view.path}/media/0`
  const isVideo = first?.kind === "video"
  const image = view.poster ?? (first?.kind === "image" ? mediaPath : null)
  const facts = [modelNameOf(view), creditsLine(view)].filter(
    (part): part is string => part !== null
  )
  return {
    title: shareCopy.title,
    description: facts.join(", "),
    image: image === null ? null : absolute(origin, image),
    video: isVideo ? absolute(origin, mediaPath) : null,
    width: first?.width ?? null,
    height: first?.height ?? null,
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
    meta("og:image:width", head.video === null ? head.width : null),
    meta("og:image:height", head.video === null ? head.height : null),
    meta("og:video", head.video),
    meta("og:video:secure_url", head.video),
    meta("og:video:type", head.video === null ? null : "video/mp4"),
    meta("og:video:width", head.video === null ? null : head.width),
    meta("og:video:height", head.video === null ? null : head.height),
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

function mediaMarkup(view: ShareView, eager: boolean): string {
  const first = view.media[0]
  if (first === undefined) {
    return ""
  }
  const src = `${view.path}/media/0`
  const ratio =
    first.width !== null && first.height !== null
      ? `aspect-ratio:${first.width}/${first.height};`
      : ""
  const style = `${ratio}width:100%;height:auto;display:block;border-radius:var(--radius-cell);background:var(--surface)`
  if (first.kind === "video") {
    const poster =
      view.poster === null ? "" : ` poster="${escapeHtml(view.poster)}"`
    return `<video src="${escapeHtml(src)}"${poster} muted loop playsinline autoplay preload="metadata" style="${style}"></video>`
  }
  if (first.kind === "audio") {
    return `<audio src="${escapeHtml(src)}" controls preload="metadata" style="width:100%"></audio>`
  }
  const loading = eager ? ` fetchpriority="high"` : ` loading="lazy"`
  const shown = view.poster ?? src
  return `<img src="${escapeHtml(shown)}" alt=""${loading} decoding="async" style="${style}" />`
}

function lockupMarkup(): string {
  return `<picture><source srcset="/icons/rosesfield-lockup-dark.svg" media="(prefers-color-scheme: dark)" /><img src="/icons/rosesfield-lockup-light.svg" alt="${escapeHtml(shareCopy.lockup)}" width="122" height="32" /></picture>`
}

function shareMarkup(view: ShareView): string {
  const facts = [modelNameOf(view), creditsLine(view)]
    .filter((part): part is string => part !== null)
    .map((part) => escapeHtml(part))
    .join(", ")
  const recreate = `/apps/${encodeURIComponent(view.run.appId)}?share=${encodeURIComponent(view.id)}`
  return [
    `<div style="min-height:100dvh;background:var(--canvas);color:var(--ink);display:flex;flex-direction:column;align-items:center;gap:var(--spacing-s6);padding:var(--spacing-s5)">`,
    `<header style="width:100%;max-width:var(--spacing-prompt-max)">${lockupMarkup()}</header>`,
    `<main style="width:100%;max-width:var(--spacing-prompt-max);display:flex;flex-direction:column;gap:var(--spacing-s3)">`,
    mediaMarkup(view, true),
    `<p style="color:var(--ink-muted)">${facts}</p>`,
    `<a href="${escapeHtml(recreate)}">${escapeHtml(shareCopy.recreate)}</a>`,
    "</main></div>",
  ].join("")
}

function exploreMarkup(views: readonly ShareView[]): string {
  const tiles = views
    .map(
      (view) =>
        `<a href="${escapeHtml(view.path)}" style="display:block;margin-bottom:var(--spacing-s2);break-inside:avoid">${mediaMarkup(view, false)}</a>`
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
    .replace(/<title>[^<]*<\/title>/, "")
    .replace(/<meta name="description"[^>]*>/, "")
    .replace("</head>", `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

export function sharePage(html: string, view: ShareView, url: string): string {
  const origin = new URL(url).origin
  return inject(html, headTags(headOf(view, origin), url), shareMarkup(view))
}

export function explorePage(
  html: string,
  views: readonly ShareView[],
  url: string
): string {
  const first = views[0]
  const head =
    first === undefined
      ? ""
      : headTags(
          { ...headOf(first, new URL(url).origin), title: shareCopy.lockup },
          url
        )
  return views.length === 0 ? html : inject(html, head, exploreMarkup(views))
}
