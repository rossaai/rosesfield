export type Recording = {
  method: "GET" | "POST"
  url: string
  status: number
  json: unknown
  filePath?: string
}

export type SentRequest = {
  method: string
  url: string
  body: string | null
  filePath: string | null
  headers: Headers
}

function filePathOf(body: unknown): string | null {
  if (!(body instanceof FormData)) {
    return null
  }
  const value = body.get("file_path")
  return typeof value === "string" ? value : null
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
    const filePath = filePathOf(init?.body)
    const index = this.pending.findIndex(
      (recording) =>
        recording.method === method &&
        recording.url === url &&
        (recording.filePath === undefined || recording.filePath === filePath)
    )
    const recording = this.pending[index]
    if (recording === undefined) {
      throw new Error(`No recording for ${method} ${url} ${filePath ?? ""}`)
    }
    this.pending.splice(index, 1)
    this.sent.push({
      method,
      url,
      body: typeof init?.body === "string" ? init.body : null,
      filePath,
      headers: new Headers(init?.headers),
    })
    return new Response(JSON.stringify(recording.json), {
      status: recording.status,
      headers: { "Content-Type": "application/json" },
    })
  }
}
