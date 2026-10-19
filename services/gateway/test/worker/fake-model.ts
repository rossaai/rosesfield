import { createServer } from "node:http"

export type ModelServer = {
  baseUrl: string
  authorizations: (string | null)[]
  close: () => Promise<void>
}

export async function serveModel(
  streams: readonly string[]
): Promise<ModelServer> {
  const queue = [...streams]
  const authorizations: (string | null)[] = []
  const server = createServer((request, response) => {
    authorizations.push(request.headers.authorization ?? null)
    request.resume()
    request.on("end", () => {
      const stream = queue.shift()
      response.writeHead(stream === undefined ? 500 : 200, {
        "content-type": "text/event-stream",
      })
      response.end(stream ?? "")
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  const port =
    typeof address === "object" && address !== null ? address.port : 0
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    authorizations,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
      }),
  }
}
