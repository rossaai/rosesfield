import {
  type AppDefinition,
  appOnlyInputsFor,
  givenRuleIssuesOf,
  isAppOnly,
  type RunInputs,
} from "@rosesfield/contract"

export type AppOnlyInputs = {
  inputs: RunInputs
  rest: Record<string, unknown>
  issues: string[]
}

export function appOnlyNamesOf(app: AppDefinition): ReadonlySet<string> {
  return new Set(app.inputs.filter(isAppOnly).map((input) => input.name))
}

export function appOnlyInputsOf(
  app: AppDefinition,
  given: Readonly<Record<string, unknown>>
): AppOnlyInputs {
  const names = appOnlyNamesOf(app)
  const entries = Object.entries(given)
  const own = Object.fromEntries(entries.filter(([name]) => names.has(name)))
  const rest = Object.fromEntries(entries.filter(([name]) => !names.has(name)))
  const parsed = appOnlyInputsFor(app).safeParse(own)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "inputs"}: ${issue.message}`
    )
    return { inputs: {}, rest, issues }
  }
  const issues = givenRuleIssuesOf(app, given, names)
  return issues.length === 0
    ? { inputs: parsed.data, rest, issues: [] }
    : { inputs: {}, rest, issues }
}
