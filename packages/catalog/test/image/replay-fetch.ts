export type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json?: unknown
  location?: string
}

export type SentRequest = {
  method: string
  url: string
  body: string | null
}

export class ReplayFetch {
  readonly sent: SentRequest[] = []
  private readonly pending: Recording[]

  constructor(recordings: readonly Recording[]) {
    this.pending = [...recordings]
  }

  readonly fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString()
    const method = (init?.method ?? "GET").toUpperCase()
    const index = this.pending.findIndex(
      (recording) => recording.method === method && recording.url === url
    )
    const recording = this.pending[index]
    if (index === -1 || recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
    })
    const headers = new Headers()
    if (recording.location !== undefined) {
      headers.set("Location", recording.location)
    }
    if (recording.json === undefined) {
      return new Response(null, { status: recording.status, headers })
    }
    headers.set("Content-Type", "application/json")
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers,
    })
  }

  unused(): Recording[] {
    return [...this.pending]
  }

  bodyOf(urlEnd: string): unknown {
    const sent = this.sent.find((one) => one.url.endsWith(urlEnd))
    return JSON.parse(sent?.body ?? "null")
  }
}
