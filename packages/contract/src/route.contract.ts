import type { z } from "zod"
import { MissingPathParamError } from "#missing-path-param.error"

export type RoutePayload = z.ZodType | "bytes" | null

export type RouteDefinition = {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: `/api/${string}`
  params: z.ZodObject | null
  query: z.ZodObject | null
  body: RoutePayload
  response: RoutePayload
  status: 200 | 201 | 202 | 204
  /** Marks a route that can start a paid run or call a paid model. */
  spends?: true
}

export function spendingRoutes(
  ...groups: ReadonlyArray<Readonly<Record<string, RouteDefinition>>>
): RouteDefinition[] {
  return groups
    .flatMap((group) => Object.values(group))
    .filter((route) => route.spends === true)
}

export type PathParamName<Path extends string> =
  Path extends `${string}:${infer Name}/${infer Rest}`
    ? Name | PathParamName<Rest>
    : Path extends `${string}:${infer Name}`
      ? Name
      : never

export function defineRoute<const Route extends RouteDefinition>(
  route: Route
): Route {
  return route
}

export function buildPath<Path extends string>(
  path: Path,
  params: Record<PathParamName<Path>, string>
): string {
  const values = new Map<string, string>(Object.entries(params))
  return path
    .split("/")
    .map((segment) => {
      if (!segment.startsWith(":")) {
        return segment
      }
      const name = segment.slice(1)
      const value = values.get(name)
      if (value === undefined) {
        throw new MissingPathParamError({ path, name })
      }
      return encodeURIComponent(value)
    })
    .join("/")
}
