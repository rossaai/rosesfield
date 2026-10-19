import { z } from "zod"
import { defineRoute } from "#route.contract"

export const keyStatus = z.enum([
  "missing",
  "valid",
  "wrong",
  "no-plan",
  "outside-workspace",
  "busy",
  "unreachable",
])

export const spendCap = z.object({
  credits: z.number().min(0),
  left: z.number().min(0),
})

export const accountStatus = z.object({
  key: keyStatus,
  credits: z.number().nullable(),
  retentionDays: z.number().int().positive().nullable(),
  cap: spendCap.nullable(),
})

export const accountResponse = z.object({ account: accountStatus })

export type KeyStatus = z.infer<typeof keyStatus>
export type AccountStatus = z.infer<typeof accountStatus>
export type SpendCapStatus = z.infer<typeof spendCap>

export const accountRoutes = {
  getAccount: defineRoute({
    method: "GET",
    path: "/api/account",
    params: null,
    query: null,
    body: null,
    response: accountResponse,
    status: 200,
  }),
  forgetAccount: defineRoute({
    method: "DELETE",
    path: "/api/account",
    params: null,
    query: null,
    body: null,
    response: null,
    status: 204,
  }),
}
