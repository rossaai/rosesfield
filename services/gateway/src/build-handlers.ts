import { CatalogModelPolicy } from "@rosesfield/catalog/comfy"
import type { AppDefinition } from "@rosesfield/contract"
import {
  AdvanceRunHandler,
  CancelRunHandler,
  CheckEngineKeyHandler,
  type GenerationEngine,
  GetRunHandler,
  type JobRunner,
  ListModelsHandler,
  ListRunsHandler,
  type PriceBook,
  PriceRunHandler,
  ReadModelFormsHandler,
  RepeatRunHandler,
  type RunRepository,
  type StartRunHandler,
  type WatchMarkPort,
} from "@rosesfield/generation"
import type { Clock } from "@rosesfield/kernel"
import {
  type AssetRepository,
  type AssetStore,
  type CharacterRepository,
  CreateCharacterHandler,
  DeleteAssetHandler,
  DeleteCharacterHandler,
  GetAssetHandler,
  GetCharacterHandler,
  LinkAssetHandler,
  ListAssetsHandler,
  ListCharactersHandler,
  PutAssetPreviewHandler,
  ReadAssetContentHandler,
  ReadAssetPreviewHandler,
  UpdateCharacterHandler,
  UploadAssetHandler,
} from "@rosesfield/library"
import { LibraryRunAssets } from "#infrastructure/library-run-assets"
import { ListedAppCatalog } from "#infrastructure/listed-app-catalog"
import { ShapedStartRunHandler } from "#run/shaped-start-run.handler"

export type HandlerPorts = {
  apps: readonly AppDefinition[]
  runs: RunRepository
  assets: AssetRepository
  characters: CharacterRepository
  store: AssetStore
  engines: readonly GenerationEngine[]
  clock: Clock
  prices?: PriceBook
  watchMarks?: WatchMarkPort
}

function pricesOf(ports: HandlerPorts): { prices?: PriceBook } {
  return ports.prices === undefined ? {} : { prices: ports.prices }
}

export type LibraryHandlers = {
  uploadAsset: UploadAssetHandler
  getAsset: GetAssetHandler
  listAssets: ListAssetsHandler
  readAssetContent: ReadAssetContentHandler
  linkAsset: LinkAssetHandler
  readAssetPreview: ReadAssetPreviewHandler
  putAssetPreview: PutAssetPreviewHandler
  deleteAsset: DeleteAssetHandler
  createCharacter: CreateCharacterHandler
  getCharacter: GetCharacterHandler
  listCharacters: ListCharactersHandler
  updateCharacter: UpdateCharacterHandler
  deleteCharacter: DeleteCharacterHandler
}

export type RunHandlers = {
  startRun: StartRunHandler
  getRun: GetRunHandler
  listRuns: ListRunsHandler
  cancelRun: CancelRunHandler
  repeatRun: RepeatRunHandler
  checkEngineKey: CheckEngineKeyHandler
  listModels: ListModelsHandler
  readModelForms: ReadModelFormsHandler
  priceRun: PriceRunHandler
}

export type Handlers = LibraryHandlers &
  RunHandlers & { advanceRun: AdvanceRunHandler }

export type Built<Jobs extends JobRunner> = {
  handlers: Handlers
  jobs: Jobs
}

export function buildLibrary(ports: HandlerPorts): LibraryHandlers {
  const { assets, characters, store, clock } = ports
  return {
    uploadAsset: new UploadAssetHandler({ assets, store, clock }),
    getAsset: new GetAssetHandler({ assets }),
    listAssets: new ListAssetsHandler({ assets }),
    readAssetContent: new ReadAssetContentHandler({ assets, store }),
    linkAsset: new LinkAssetHandler({ assets, store }),
    readAssetPreview: new ReadAssetPreviewHandler({ assets, store }),
    putAssetPreview: new PutAssetPreviewHandler({ assets, store }),
    deleteAsset: new DeleteAssetHandler({ assets, store, characters }),
    createCharacter: new CreateCharacterHandler({ characters, assets, clock }),
    getCharacter: new GetCharacterHandler({ characters }),
    listCharacters: new ListCharactersHandler({ characters }),
    updateCharacter: new UpdateCharacterHandler({ characters, assets }),
    deleteCharacter: new DeleteCharacterHandler({ characters }),
  }
}

function runAssetsOf(library: LibraryHandlers): LibraryRunAssets {
  return new LibraryRunAssets({
    readContent: library.readAssetContent,
    getCharacter: library.getCharacter,
    upload: library.uploadAsset,
    putPreview: library.putAssetPreview,
  })
}

export function buildAdvance(
  ports: HandlerPorts,
  library: LibraryHandlers
): AdvanceRunHandler {
  return new AdvanceRunHandler({
    apps: new ListedAppCatalog({ apps: ports.apps }),
    runs: ports.runs,
    engines: ports.engines,
    assets: runAssetsOf(library),
    clock: ports.clock,
    ...pricesOf(ports),
    ...(ports.watchMarks === undefined ? {} : { watchMarks: ports.watchMarks }),
  })
}

function buildRuns(
  ports: HandlerPorts,
  library: LibraryHandlers,
  jobs: JobRunner
): RunHandlers {
  const { runs, engines, clock } = ports
  const apps = new ListedAppCatalog({ apps: ports.apps })
  const startRun = new ShapedStartRunHandler({
    apps,
    runs,
    engines,
    jobs,
    clock,
    policy: new CatalogModelPolicy(),
    assets: runAssetsOf(library),
  })
  return {
    startRun,
    getRun: new GetRunHandler({ runs }),
    listRuns: new ListRunsHandler({ runs }),
    cancelRun: new CancelRunHandler({ runs, engines, clock }),
    repeatRun: new RepeatRunHandler({ runs, start: startRun }),
    checkEngineKey: new CheckEngineKeyHandler({ engines }),
    listModels: new ListModelsHandler({ engines }),
    readModelForms: new ReadModelFormsHandler({ engines }),
    priceRun: new PriceRunHandler({ apps, engines, ...pricesOf(ports) }),
  }
}

export function buildHandlers<Jobs extends JobRunner>(
  ports: HandlerPorts,
  jobsFor: (advance: AdvanceRunHandler) => Jobs
): Built<Jobs> {
  const library = buildLibrary(ports)
  const advanceRun = buildAdvance(ports, library)
  const jobs = jobsFor(advanceRun)
  return {
    handlers: { ...library, ...buildRuns(ports, library, jobs), advanceRun },
    jobs,
  }
}
