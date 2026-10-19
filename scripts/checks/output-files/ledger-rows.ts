import { creditsOfCost } from "../../../packages/catalog/src/comfy/comfy-credits"

type Row = Record<string, unknown>

type LedgerRun = {
  id: string
  appId: string
  model: string
  workflowHash: string | null
  finishedAt: string
  costAmount: number | null
}

export function ledgerRowsOf(runs: readonly unknown[], since: Date): string[] {
  return runs
    .flatMap((value) => {
      const one = ledgerRunOf(value)
      return one === null || Date.parse(one.finishedAt) < since.getTime()
        ? []
        : [one]
    })
    .sort((one, other) => one.finishedAt.localeCompare(other.finishedAt))
    .map(lineOf)
}

function ledgerRunOf(value: unknown): LedgerRun | null {
  const run = rowOf(value)
  const engine = rowOf(run.engine)
  const inputs = rowOf(run.inputs)
  const cost = rowOf(run.cost)
  const models = Array.isArray(engine.models) ? engine.models.map(String) : []
  if (run.origin !== "live" || typeof run.finishedAt !== "string") {
    return null
  }
  return {
    id: String(run.id),
    appId: String(run.appId),
    model: typeof inputs.model === "string" ? inputs.model : models.join(", "),
    workflowHash:
      typeof engine.workflowHash === "string" ? engine.workflowHash : null,
    finishedAt: run.finishedAt,
    costAmount: typeof cost.amount === "number" ? cost.amount : null,
  }
}

function lineOf(one: LedgerRun): string {
  const graph =
    one.workflowHash === null
      ? ""
      : `, workflow hash ${one.workflowHash.slice(0, 8)}`
  const where = `One Generate in ${one.appId} of the running app, run ${one.id.slice(0, 8)}${graph}`
  if (one.costAmount === null) {
    return `| ${one.finishedAt} | ${one.model} | not measured | The gateway's credit meter read no balance delta for this run alone. ${where} |`
  }
  const credits =
    Math.round(creditsOfCost({ amount: one.costAmount }) * 1_000_000) /
    1_000_000
  return `| ${one.finishedAt} | ${one.model} | ${credits} | Balance delta, GET /customers/balance before the submit and after the run ended, read by the gateway's credit meter. ${where} |`
}

function rowOf(value: unknown): Row {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {}
}
