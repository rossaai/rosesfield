import type { ToolRegistration } from "@earendil-works/pi-durable"
import { routes } from "@rosesfield/contract"
import type { GetRunHandler } from "@rosesfield/generation"
import type {
  GetAssetHandler,
  GetCharacterHandler,
  ListAssetsHandler,
  ListCharactersHandler,
} from "@rosesfield/library"
import { z } from "zod"
import { agentCopy } from "#copy.en"
import { jsonOutput, toolParameters } from "#infrastructure/pi-tool-io"

export type LibraryToolHandlers = {
  listAssets: ListAssetsHandler
  getAsset: GetAssetHandler
  listCharacters: ListCharactersHandler
  getCharacter: GetCharacterHandler
  getRun: GetRunHandler
}

type ReadToolOptions<Args> = {
  name: string
  description: string
  schema: z.ZodType<Args>
  read: (args: Args) => Promise<unknown>
}

function readTool<Args>(options: ReadToolOptions<Args>): ToolRegistration {
  return {
    name: options.name,
    description: options.description,
    parameters: toolParameters(options.schema),
    replay: "safe",
    execute: async (args: unknown) => ({
      output: jsonOutput(await options.read(options.schema.parse(args))),
    }),
  }
}

export function libraryTools(
  handlersOf: () => LibraryToolHandlers
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
    readTool({
      name: "read_asset",
      description: copy.readAsset,
      schema: routes.getAsset.params,
      read: (params) => handlersOf().getAsset.execute(params),
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
      read: (params) => handlersOf().getRun.execute(params),
    }),
  ]
}
