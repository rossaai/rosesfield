import { createHash } from "node:crypto"
import { appendFileSync } from "node:fs"

const [journal = "", failOn = "", existing = "", ...args] =
  process.argv.slice(2)
const command = args.slice(0, 2).join(" ")
const env = args.find((arg) => arg.startsWith("--env="))?.slice(6) ?? ""

async function stdinHash(): Promise<string | null> {
  if (args[0] !== "secret" || args[1] !== "put" || process.stdin.isTTY) {
    return null
  }
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk))
  }
  return createHash("sha256").update(Buffer.concat(chunks)).digest("hex")
}

appendFileSync(
  journal,
  `${JSON.stringify({
    args,
    home: process.env.HOME,
    config: process.env.XDG_CONFIG_HOME,
    ci: process.env.CI ?? null,
    stdinHash: await stdinHash(),
  })}\n`
)

const has = (kind: string): boolean => existing.split(",").includes(kind)

if (failOn !== "" && command.startsWith(failOn)) {
  console.error(`fake wrangler: ${command} fails here`)
  process.exit(3)
}
if (command === "r2 bucket" && args[2] === "info" && !has("r2")) {
  process.exit(1)
}
if (command === "d1 info" && !has("d1")) {
  process.exit(1)
}
if (command === "secret list") {
  console.log(
    JSON.stringify(
      has("secrets")
        ? [
            { name: "SESSION_SECRET", type: "secret_text" },
            { name: "OWNER_TOKEN", type: "secret_text" },
            { name: "COMFY_API_KEY", type: "secret_text" },
          ]
        : []
    )
  )
}
if (args[0] === "deploy") {
  const worker = env === "judge" ? "rosesfield-judge" : "rosesfield"
  console.log(
    `Deployed ${worker}\n  https://${worker}.fake-account.workers.dev`
  )
}
