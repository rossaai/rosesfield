import { fileURLToPath } from "node:url"

export type DeployTarget = {
  kind: "public" | "judge"
  env: string
  worker: string
  database: string
  bucket: string
  secret: "SESSION_SECRET" | "OWNER_TOKEN"
}

export const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url))

export const gatewayRoot = fileURLToPath(
  new URL("../../services/gateway", import.meta.url)
)

export const deployTargets = {
  public: {
    kind: "public",
    env: "",
    worker: "rosesfield",
    database: "rosesfield",
    bucket: "rosesfield-assets",
    secret: "SESSION_SECRET",
  },
  judge: {
    kind: "judge",
    env: "judge",
    worker: "rosesfield-judge",
    database: "rosesfield-judge",
    bucket: "rosesfield-judge-assets",
    secret: "OWNER_TOKEN",
  },
} as const satisfies Record<DeployTarget["kind"], DeployTarget>
