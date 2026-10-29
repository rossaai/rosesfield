import { type CallToolResult, McpServer } from "@modelcontextprotocol/server"
import {
  appInputOf,
  isKeyframeChain,
  isOwnVideoRun,
  keyframeRunsOf,
  namedDraftOf,
  ownVideoDraftOf,
  ownVideoFinalOf,
  parseRequest,
  timerWait,
} from "@rosesfield/agent"
import type { ModelForm } from "@rosesfield/catalog/comfy"
import { isFinalRun } from "@rosesfield/catalog/motion"
import {
  type AppDefinition,
  buildPath,
  errorEnvelopeOf,
  type RunInputs,
  routes,
  run,
  runResponse,
  startRunBody,
} from "@rosesfield/contract"
import { ProjectError } from "@rosesfield/kernel"
import { z } from "zod"
import { gatewayCopy } from "#copy.en"
import { RunNeedsYesError } from "#error/run-needs-yes.error"
import type { RequestScope } from "#gateway-env"
import { splitStartRunArguments, startRunInputOf } from "#mcp/start-run-input"
import gatewayPackage from "../../package.json" with { type: "json" }

export type CatalogServerOptions = {
  apps: readonly AppDefinition[]
  forms: readonly ModelForm[]
  scope: RequestScope
}

const keyPrefix = "mcp-"

const keyframeRunsResponse = z.object({ runs: z.array(run.nullable()) })

/** A Motion call answers with its run, and on your own video's draft with the final's credits and the photos the plan left out, counted from 0. */
const motionResponse = runResponse.extend({
  finalCredits: z.number().nullable().optional(),
  leftOutPhotos: z.array(z.number().int().min(0)).optional(),
})

function outputOf(app: AppDefinition) {
  if (isKeyframeChain(app)) {
    return keyframeRunsResponse
  }
  return app.id === "motion" ? motionResponse : runResponse
}

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
}

function contentPath(assetId: string): string {
  return buildPath(routes.readAssetContent.path, { assetId })
}

export function catalogMcpServer(options: CatalogServerOptions): McpServer {
  const server = new McpServer(
    { name: "rosesfield", version: gatewayPackage.version },
    { instructions: gatewayCopy.mcp.instructions }
  )
  for (const app of options.apps.filter((one) => one.closedKey === null)) {
    server.registerTool(
      app.id,
      {
        description: gatewayCopy.mcp.toolDescription(app.id, app.output.kind),
        inputSchema: startRunInputOf(app, options.forms),
        outputSchema: outputOf(app),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      (args, extra) =>
        answer(() => {
          if (isKeyframeChain(app)) {
            return startKeyframes(options.scope, app, args, extra.mcpReq.signal)
          }
          return isOwnVideoRun(
            app.id,
            inputsOf(splitStartRunArguments(args).body)
          )
            ? startOwnVideo(options.scope, app, args, extra.mcpReq.signal)
            : startRun(options.scope, app, args)
        })
    )
  }
  libraryTools(server, options.scope)
  return server
}

async function startRun(
  scope: RequestScope,
  app: AppDefinition,
  args: unknown
): Promise<unknown> {
  const { body, idempotencyKey } = splitStartRunArguments(args)
  if (isFinalRun(app.id, inputsOf(body))) {
    throw new RunNeedsYesError({ appId: app.id })
  }
  const key = idempotencyKey ?? `${keyPrefix}${crypto.randomUUID()}`
  return scope.handlers.startRun.execute({
    appId: app.id,
    body,
    idempotencyKey: await scope.keyFor(key),
    seed: null,
  })
}

function inputsOf(body: unknown): RunInputs {
  const parsed = startRunBody.safeParse(body)
  return parsed.success ? parsed.data.inputs : {}
}

/** Your own video in one call: the plan, the read, the edit and the 480p draft, with the final's credits. A second call that names the draft makes the final. */
async function startOwnVideo(
  scope: RequestScope,
  app: AppDefinition,
  args: unknown,
  signal: AbortSignal
): Promise<unknown> {
  const { body, idempotencyKey } = splitStartRunArguments(args)
  const key = idempotencyKey ?? `${keyPrefix}${crypto.randomUUID()}`
  const request = parseRequest(app, appInputOf(app, []), body)
  const runs = {
    handlers: scope.handlers,
    request,
    key: (await scope.keyFor(key)) ?? key,
    wait: timerWait,
    signal,
    poll: scope.pollRun,
  }
  const draft = namedDraftOf(request.inputs)
  return draft === null ? ownVideoDraftOf(runs) : ownVideoFinalOf(runs, draft)
}

async function startKeyframes(
  scope: RequestScope,
  app: AppDefinition,
  args: unknown,
  signal: AbortSignal
): Promise<unknown> {
  const { body, idempotencyKey } = splitStartRunArguments(args)
  const key = idempotencyKey ?? `${keyPrefix}${crypto.randomUUID()}`
  const runs = await keyframeRunsOf({
    appId: app.id,
    request: parseRequest(app, appInputOf(app, []), body),
    key: (await scope.keyFor(key)) ?? key,
    handlers: scope.handlers,
    wait: timerWait,
    signal,
    poll: scope.pollRun,
  })
  return { runs }
}

function libraryTools(server: McpServer, scope: RequestScope): void {
  const copy = gatewayCopy.mcp
  server.registerTool(
    "read_run",
    {
      description: copy.readRun,
      inputSchema: routes.getRun.params,
      annotations: readOnly,
    },
    (args) => answer(() => readRun(scope, args.runId))
  )
  server.registerTool(
    "list_assets",
    {
      description: copy.listAssets,
      inputSchema: routes.listAssets.query,
      annotations: readOnly,
    },
    (args) =>
      answer(async () => {
        const page = await scope.handlers.listAssets.execute({
          kind: args.kind ?? null,
          cursor: args.cursor ?? null,
        })
        return {
          ...page,
          assets: page.assets.map((asset) => ({
            ...asset,
            content: contentPath(asset.id),
          })),
        }
      })
  )
  server.registerTool(
    "list_characters",
    {
      description: copy.listCharacters,
      inputSchema: z.strictObject({}),
      annotations: readOnly,
    },
    () => answer(() => scope.handlers.listCharacters.execute())
  )
}

async function readRun(scope: RequestScope, runId: string): Promise<unknown> {
  await scope.pollRun(runId)
  const { run } = await scope.handlers.getRun.execute({ runId })
  const outputs = await Promise.all(
    run.outputs.map(async (assetId) => {
      const { asset } = await scope.handlers.getAsset.execute({ assetId })
      return { ...asset, content: contentPath(asset.id) }
    })
  )
  return { run, outputs }
}

async function answer(read: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const value = await read()
    const structured = z.record(z.string(), z.unknown()).parse(value)
    return {
      content: [{ type: "text", text: JSON.stringify(value) }],
      structuredContent: structured,
    }
  } catch (error) {
    return toolError(error)
  }
}

function toolError(error: unknown): CallToolResult {
  if (error instanceof ProjectError) {
    const failure = { ...errorEnvelopeOf(error), message: error.message }
    return {
      content: [{ type: "text", text: JSON.stringify(failure) }],
      isError: true,
    }
  }
  console.error(error)
  const failure = { error: { code: "SERVER_ERROR", status: 500 } }
  return {
    content: [{ type: "text", text: JSON.stringify(failure) }],
    isError: true,
  }
}
