export type Recording = {
  method: "GET" | "POST" | "PUT"
  url: string
  status: number
  headers?: Record<string, string>
  json?: unknown
  bytes?: Uint8Array
}

export type SentRequest = {
  method: string
  url: string
  headers: Headers
  body: string | null
  form: FormData | null
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
    const recording = index === -1 ? undefined : this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      method,
      url,
      headers: headersOf(init?.headers),
      body: typeof init?.body === "string" ? init.body : null,
      form: init?.body instanceof FormData ? init.body : null,
    })
    return responseOf(recording)
  }

  unused(): Recording[] {
    return [...this.pending]
  }
}

function headersOf(given: RequestInit["headers"]): Headers {
  if (given instanceof Headers) {
    return given
  }
  const headers = new Headers()
  if (given === undefined) {
    return headers
  }
  if (Array.isArray(given) || Symbol.iterator in given) {
    throw new Error("The replay reads headers as a Headers object or a record")
  }
  for (const [name, value] of Object.entries(given)) {
    for (const one of typeof value === "string" ? [value] : value) {
      headers.append(name, one)
    }
  }
  return headers
}

function responseOf(recording: Recording): Response {
  const headers = new Headers(recording.headers)
  if (recording.json !== undefined) {
    headers.set("Content-Type", "application/json")
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers,
    })
  }
  const body =
    recording.bytes === undefined ? null : new Uint8Array(recording.bytes)
  return new Response(body, { status: recording.status, headers })
}
