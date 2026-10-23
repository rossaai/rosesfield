import { type AssetLink, routes } from "@rosesfield/contract"
import { assetIdFormat, type Clock } from "@rosesfield/kernel"

type ContentLinksOptions = {
  secret: string
  clock: Clock
}

export type LinkHolder = {
  sessionId: string | null
}

export type SignContent = (url: string) => Promise<AssetLink>

const contentPath = new RegExp(
  `^${routes.readAssetContent.path.replace(":assetId", "([^/]+)")}$`
)
const signaturePattern = /^[0-9a-f]{64}$/
const expiryPattern = /^\d{13}$/

export class ContentLinks {
  static readonly lifetimeMs = 10 * 60_000
  static readonly params = {
    expires: "expires",
    session: "session",
    signature: "signature",
  }

  private readonly key: Promise<CryptoKey>
  private readonly clock: Clock

  constructor(options: ContentLinksOptions) {
    this.clock = options.clock
    this.key = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(options.secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
  }

  async sign(url: string, sessionId: string | null): Promise<AssetLink> {
    const target = new URL(url, "http://link.invalid")
    const assetId = assetIdOf(target.pathname)
    if (assetId === null) {
      throw new TypeError("A content link signs only an asset's content path")
    }
    const expires = this.clock.now().getTime() + ContentLinks.lifetimeMs
    const signed = await crypto.subtle.sign(
      "HMAC",
      await this.key,
      messageOf(assetId, sessionId, expires)
    )
    const { params } = ContentLinks
    target.searchParams.set(params.expires, String(expires))
    if (sessionId !== null) {
      target.searchParams.set(params.session, sessionId)
    }
    target.searchParams.set(params.signature, hexOf(signed))
    return {
      url: `${target.pathname}${target.search}`,
      expiresAt: new Date(expires).toISOString(),
    }
  }

  async holderOf(request: Request): Promise<LinkHolder | null> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return null
    }
    const url = new URL(request.url)
    const assetId = assetIdOf(url.pathname)
    const { params } = ContentLinks
    const expires = url.searchParams.get(params.expires) ?? ""
    const signature = url.searchParams.get(params.signature) ?? ""
    const sessionId = url.searchParams.get(params.session)
    if (
      assetId === null ||
      !expiryPattern.test(expires) ||
      !signaturePattern.test(signature) ||
      Number(expires) <= this.clock.now().getTime()
    ) {
      return null
    }
    const isSigned = await crypto.subtle.verify(
      "HMAC",
      await this.key,
      bytesOfHex(signature),
      messageOf(assetId, sessionId, Number(expires))
    )
    return isSigned ? { sessionId } : null
  }
}

function assetIdOf(pathname: string): string | null {
  const assetId = contentPath.exec(pathname)?.[1]
  return assetId !== undefined && assetIdFormat.is(assetId) ? assetId : null
}

function messageOf(
  assetId: string,
  sessionId: string | null,
  expires: number
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    `asset-content\n${assetId}\n${sessionId ?? ""}\n${expires}`
  )
}

function hexOf(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function bytesOfHex(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2)
  for (let at = 0; at < bytes.length; at += 1) {
    bytes[at] = Number.parseInt(hex.slice(at * 2, at * 2 + 2), 16)
  }
  return bytes
}
