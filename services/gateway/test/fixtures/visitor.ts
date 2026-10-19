import type { GatewayApp } from "#gateway-env"
import { sessionCookie } from "#session/session-cookie"

export type Seen = {
  status: number
  headers: string
  body: string
}

type VisitorOptions = {
  app: GatewayApp
  keys?: Record<string, string>
  seen: Seen[]
}

type CallInit = {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit
}

const cookiePattern = new RegExp(`${sessionCookie.name}=([^;]+)`)

export class Visitor {
  cookie: string | null = null
  private readonly app: GatewayApp
  private readonly keys: Record<string, string>
  private readonly seen: Seen[]

  constructor(options: VisitorOptions) {
    this.app = options.app
    this.keys = options.keys ?? {}
    this.seen = options.seen
  }

  withoutKeys(): Visitor {
    const visitor = new Visitor({ app: this.app, seen: this.seen })
    visitor.cookie = this.cookie
    return visitor
  }

  async call(path: string, init: CallInit = {}): Promise<Response> {
    const response = await this.app.request(
      `https://demo.rosesfield.test${path}`,
      {
        ...init,
        headers: {
          ...this.keys,
          ...(this.cookie === null
            ? {}
            : { cookie: `${sessionCookie.name}=${this.cookie}` }),
          ...init.headers,
        },
      }
    )
    const set = cookiePattern.exec(response.headers.get("set-cookie") ?? "")
    if (set?.[1] !== undefined) {
      this.cookie = set[1]
    }
    const body = await response.clone().text()
    this.seen.push({
      status: response.status,
      headers: JSON.stringify([...response.headers.entries()]),
      body,
    })
    return response
  }
}
