import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { exampleRecords, exampleRunRows } from "#effects/example-records"
import {
  type ExampleRun,
  exampleLedger,
  type LibraryExample,
  libraryExample,
} from "#motion/examples/library-example.contract"
import { readingFailures } from "#motion/examples/reading-failures"

type Preview = NonNullable<LibraryExample["preview"]>

export function readLedger(source: unknown): ExampleRun[] {
  const parsed = exampleLedger.safeParse(source)
  if (!parsed.success) {
    throw new AppDefinitionInvalidError({
      folder: "motion",
      reason: `the run ledger runs.json is invalid: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join(", ")}`,
    })
  }
  return parsed.data
}

function ledgerFailure(
  example: string,
  preview: Preview,
  ledger: readonly ExampleRun[]
): string | null {
  const run = ledger.find((row) => row.runId === preview.runId)
  if (run === undefined) {
    return `the run ${preview.runId} is not a row of the run ledger`
  }
  const sameInput =
    run.example === example &&
    run.workflowHash === preview.workflowHash &&
    run.seed === preview.seed &&
    run.resolution === preview.resolution &&
    run.aspectRatio === preview.aspectRatio
  if (!sameInput) {
    return `the run ledger records the run ${preview.runId} with another recipe or input`
  }
  if (run.verdict !== "kept") {
    return `the run ledger records the run ${preview.runId} as refused`
  }
  return null
}

export function readExamples(
  sources: Readonly<Record<string, unknown>>,
  ledger: readonly ExampleRun[]
): LibraryExample[] {
  return Object.entries(sources).map(([file, source]) => {
    const parsed = libraryExample.safeParse(source)
    if (!parsed.success) {
      throw new AppDefinitionInvalidError({
        folder: "motion",
        reason: `the example ${file}.json is invalid: ${parsed.error.issues
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join(", ")}`,
      })
    }
    if (parsed.data.id !== file) {
      throw new AppDefinitionInvalidError({
        folder: "motion",
        reason: `the example ${file}.json names the example ${parsed.data.id}`,
      })
    }
    const { proof, preview, passed } = parsed.data
    const unrecorded =
      preview === null || !passed ? null : ledgerFailure(file, preview, ledger)
    if (unrecorded !== null) {
      throw new AppDefinitionInvalidError({
        folder: "motion",
        reason: `the example ${file}.json passed on a run the ledger does not keep: ${unrecorded}`,
      })
    }
    const failures =
      proof === null || preview === null
        ? []
        : readingFailures(parsed.data, proof.reading, preview)
    if (failures.length > 0) {
      throw new AppDefinitionInvalidError({
        folder: "motion",
        reason: `the example ${file}.json passed on a run outside its criteria: ${failures.join(", ")}`,
      })
    }
    return parsed.data
  })
}

export const exampleRuns: readonly ExampleRun[] = readLedger(exampleRunRows)

export const libraryExamples: readonly LibraryExample[] = readExamples(
  exampleRecords,
  exampleRuns
)

export const approvedExamples: readonly LibraryExample[] =
  libraryExamples.filter((example) => example.approved)

export function guideOf(
  id: string,
  examples: readonly LibraryExample[] = libraryExamples
): LibraryExample["guide"] {
  return examples.find((example) => example.id === id)?.guide ?? null
}

export function exampleOf(id: string): LibraryExample {
  const found = libraryExamples.find((example) => example.id === id)
  if (found === undefined) {
    throw new AppDefinitionInvalidError({
      folder: "motion",
      reason: `no record holds the example ${id}`,
    })
  }
  return found
}

export function exampleKeyOf(id: string): string {
  return id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
}

export type {
  ExampleGuide,
  ExampleRun,
  LibraryExample,
  ResolutionValue,
} from "#motion/examples/library-example.contract"
