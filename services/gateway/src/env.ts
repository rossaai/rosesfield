import type { AgentModel } from "@rosesfield/agent"
import { z } from "zod"
import { readAgentEnv } from "#agent/agent-env"
import {
  comfyCloudUrl,
  comfyTargetOf,
  type EngineSettings,
} from "#engine/engine-target"
import { EnvInvalidError } from "#error/env-invalid.error"

export type OwnerLock = { mode: "local" } | { mode: "token"; token: string }

export type PublicAccess = {
  mode: "public"
  sessionSecret: string
  retentionDays: number
  requestsPerMinute: number
  newSessionsPerMinute: number
  addressRequestsPerMinute: number
}

export type Access = { mode: "owner"; lock: OwnerLock } | PublicAccess

export type WorkerVars = {
  engine: EngineSettings
  access: Access
  agent: AgentModel | null
  spend?: SpendSettings
}

export type SpendSettings = {
  capCredits: number
  unknownRunCredits: number
}

export type ServerEnv = WorkerVars & {
  host: string
  port: number
  dataDir: string
  clientAddressHeader?: string
}

const loopbackHosts: readonly string[] = ["127.0.0.1", "::1", "localhost"]
const minSecretLength = 32

function blankAsMissing(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

const optionalText = z.preprocess(blankAsMissing, z.string().optional())

const secret = z.preprocess(
  blankAsMissing,
  z
    .string()
    .regex(/^\S+$/, "holds no space")
    .min(minSecretLength, `needs at least ${minSecretLength} characters`)
    .optional()
)

function whole(min: number, max: number, fallback: number) {
  return z.preprocess(
    blankAsMissing,
    z.coerce
      .number({ error: "needs a number" })
      .int("needs a whole number")
      .min(min, `needs a number from ${min} to ${max}`)
      .max(max, `needs a number from ${min} to ${max}`)
      .default(fallback)
  )
}

const sharedFields = {
  MODE: z.preprocess(
    blankAsMissing,
    z
      .enum(["owner", "public"], { error: "needs owner or public" })
      .default("owner")
  ),
  COMFY_API_KEY: optionalText,
  COMFY_BASE_URL: z.preprocess(
    blankAsMissing,
    z
      .url({ protocol: /^https?$/, error: "needs an http or https URL" })
      .optional()
  ),
  OWNER_TOKEN: secret,
  SESSION_SECRET: secret,
  RETENTION_DAYS: whole(1, 365, 30),
  SESSION_REQUESTS_PER_MINUTE: whole(1, 10_000, 600),
  NEW_SESSIONS_PER_MINUTE: whole(1, 10_000, 30),
  ADDRESS_REQUESTS_PER_MINUTE: whole(1, 100_000, 6000),
  SPEND_UNKNOWN_RUN_CREDITS: whole(1, 100_000, 100),
  SPEND_CAP_CREDITS: z.preprocess(
    blankAsMissing,
    z.coerce
      .number({ error: "needs a number" })
      .positive("needs a number above 0")
      .optional()
  ),
}

const serverSchema = z.object({
  ...sharedFields,
  HOST: z.preprocess(blankAsMissing, z.string().default("127.0.0.1")),
  PORT: whole(1, 65_535, 8787),
  DATA_DIR: z.preprocess(blankAsMissing, z.string().default("./data")),
  CLIENT_ADDRESS_HEADER: z.preprocess(
    blankAsMissing,
    z
      .string()
      .regex(/^[A-Za-z0-9-]+$/, "needs a header name")
      .transform((name) => name.toLowerCase())
      .optional()
  ),
})

const workerSchema = z.object(sharedFields)

type SharedEnv = z.infer<typeof workerSchema>

function parse<Shape>(
  schema: z.ZodType<Shape>,
  source: Readonly<Record<string, unknown>>
): Shape {
  const result = schema.safeParse(source)
  if (result.success) {
    return result.data
  }
  throw new EnvInvalidError({
    problems: result.error.issues.map(
      (issue) => `${issue.path.join(".")} ${issue.message}.`
    ),
  })
}

function problem(text: string): EnvInvalidError {
  return new EnvInvalidError({ problems: [text] })
}

function engineOf(env: SharedEnv): EngineSettings {
  const baseUrl = env.COMFY_BASE_URL
  if (baseUrl !== undefined) {
    return {
      target: comfyTargetOf(baseUrl),
      baseUrl,
      apiKey: env.COMFY_API_KEY ?? null,
    }
  }
  if (env.COMFY_API_KEY !== undefined || env.MODE === "public") {
    return {
      target: "comfy-cloud",
      baseUrl: comfyCloudUrl,
      apiKey: env.COMFY_API_KEY ?? null,
    }
  }
  return { target: "demo" }
}

function publicAccess(env: SharedEnv): PublicAccess {
  if (env.COMFY_API_KEY !== undefined) {
    throw problem(
      "COMFY_API_KEY is set. Public mode holds no key of its own, because each visitor brings their own. Leave COMFY_API_KEY empty."
    )
  }
  if (env.OWNER_TOKEN !== undefined) {
    throw problem(
      "OWNER_TOKEN is set. Public mode has no owner, so it reads no owner token. Leave OWNER_TOKEN empty."
    )
  }
  if (env.SESSION_SECRET === undefined) {
    throw problem(
      `SESSION_SECRET is missing. Public mode signs each visitor's session with it, so it needs a secret of at least ${minSecretLength} characters.`
    )
  }
  return {
    mode: "public",
    sessionSecret: env.SESSION_SECRET,
    retentionDays: env.RETENTION_DAYS,
    requestsPerMinute: env.SESSION_REQUESTS_PER_MINUTE,
    newSessionsPerMinute: env.NEW_SESSIONS_PER_MINUTE,
    addressRequestsPerMinute: env.ADDRESS_REQUESTS_PER_MINUTE,
  }
}

function missingToken(reason: string): EnvInvalidError {
  return problem(
    `OWNER_TOKEN is missing. ${reason}, so it needs an owner token of at least ${minSecretLength} characters.`
  )
}

function varsOf(
  env: SharedEnv,
  source: Readonly<Record<string, unknown>>,
  lockFor: (token: string | undefined) => OwnerLock
): WorkerVars {
  const access: Access =
    env.MODE === "public"
      ? publicAccess(env)
      : { mode: "owner", lock: lockFor(env.OWNER_TOKEN) }
  const engine = engineOf(env)
  return {
    engine,
    access,
    agent: readAgentEnv(source, engine, access.mode),
    ...(access.mode === "owner" && env.SPEND_CAP_CREDITS !== undefined
      ? {
          spend: {
            capCredits: env.SPEND_CAP_CREDITS,
            unknownRunCredits: env.SPEND_UNKNOWN_RUN_CREDITS,
          },
        }
      : {}),
  }
}

export function readServerEnv(
  source: Readonly<Record<string, unknown>>
): ServerEnv {
  const env = parse(serverSchema, source)
  const vars = varsOf(env, source, (token) => {
    if (token !== undefined) {
      return { mode: "token", token }
    }
    if (!loopbackHosts.includes(env.HOST)) {
      throw missingToken(
        `A server that listens on ${env.HOST} answers beyond this computer`
      )
    }
    return { mode: "local" }
  })
  return {
    ...vars,
    host: env.HOST,
    port: env.PORT,
    dataDir: env.DATA_DIR,
    ...(env.CLIENT_ADDRESS_HEADER === undefined
      ? {}
      : { clientAddressHeader: env.CLIENT_ADDRESS_HEADER }),
  }
}

export function readWorkerEnv(
  source: Readonly<Record<string, unknown>>
): WorkerVars {
  const env = parse(workerSchema, source)
  return varsOf(env, source, (token) => {
    if (token === undefined) {
      throw missingToken("A Cloudflare deployment answers beyond your machine")
    }
    return { mode: "token", token }
  })
}
