import type { ToolRegistration } from "@earendil-works/pi-durable"
import { routes } from "@rosesfield/contract"
import {
  type GetRunHandler,
  type GetRunOutput,
  Run,
} from "@rosesfield/generation"
import type {
  GetAssetHandler,
  GetCharacterHandler,
  ListAssetsHandler,
  ListCharactersHandler,
  ReadAssetContentHandler,
  ReadAssetPreviewHandler,
} from "@rosesfield/library"
import { z } from "zod"
import { agentCopy } from "#copy.en"
import { type ImagesOf, readAssetTool } from "#infrastructure/pi-asset-media"
import { jsonOutput, toolParameters } from "#infrastructure/pi-tool-io"

export type LibraryToolHandlers = {
  listAssets: ListAssetsHandler
  getAsset: GetAssetHandler
  readAssetContent: ReadAssetContentHandler
  readAssetPreview: ReadAssetPreviewHandler
  listCharacters: ListCharactersHandler
  getCharacter: GetCharacterHandler
  getRun: GetRunHandler
}

export type RunWait = (ms: number, signal?: AbortSignal) => Promise<void>

type ReadToolOptions<Args> = {
  name: string
  description: string
  schema: z.ZodType<Args>
  read: (args: Args, signal?: AbortSignal) => Promise<unknown>
}

export const runWait = {
  pollMs: 2_000,
  limitMs: 180_000,
}

export function timerWait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

function readTool<Args>(options: ReadToolOptions<Args>): ToolRegistration {
  return {
    name: options.name,
    description: options.description,
    parameters: toolParameters(options.schema),
    replay: "safe",
    execute: async (args: unknown, _api, context) => ({
      output: jsonOutput(
        await options.read(options.schema.parse(args), context.abortSignal)
      ),
    }),
  }
}

export type RunPoll = (runId: string) => Promise<void>

export async function readRunToEnd(
  getRun: GetRunHandler,
  runId: string,
  wait: RunWait,
  signal?: AbortSignal,
  poll?: RunPoll
): Promise<GetRunOutput> {
  for (let waited = 0; ; waited += runWait.pollMs) {
    await poll?.(runId)
    const read = await getRun.execute({ runId })
    if (
      Run.finishedStatuses.includes(read.run.status) ||
      waited >= runWait.limitMs
    ) {
      return read
    }
    await wait(runWait.pollMs, signal)
    signal?.throwIfAborted()
  }
}

export function libraryTools(
  handlersOf: () => LibraryToolHandlers,
  wait: RunWait = timerWait,
  images?: ImagesOf
): ToolRegistration[] {
  const copy = agentCopy.tools
  return [
    readTool({
      name: "list_assets",
      description: copy.listAssets,
      schema: routes.listAssets.query,
      read: (query) =>
        handlersOf().listAssets.execute({
          kind: query.kind ?? null,
          cursor: query.cursor ?? null,
        }),
    }),
    readAssetTool({
      handlersOf,
      ...(images === undefined ? {} : { images }),
    }),
    readTool({
      name: "list_characters",
      description: copy.listCharacters,
      schema: z.strictObject({}),
      read: () => handlersOf().listCharacters.execute(),
    }),
    readTool({
      name: "read_character",
      description: copy.readCharacter,
      schema: routes.getCharacter.params,
      read: (params) => handlersOf().getCharacter.execute(params),
    }),
    readTool({
      name: "read_run",
      description: copy.readRun,
      schema: routes.getRun.params,
      read: (params, signal) =>
        readRunToEnd(handlersOf().getRun, params.runId, wait, signal),
    }),
  ]
}
