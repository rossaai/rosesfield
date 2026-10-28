import { createHash } from "node:crypto"
import { appendFileSync } from "node:fs"

const [journal = "", failOn = "", existing = "", ...args] =
  process.argv.slice(2)
const line = args.join(" ")
const env = args.find((arg) => arg.startsWith("--env="))?.slice(6) ?? ""
const has = (kind: string): boolean => existing.split(",").includes(kind)
const accountVariables = /^(CLOUDFLARE_|CF_|WRANGLER_)/

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
    accountVariables: Object.fromEntries(
      Object.entries(process.env).filter(([name]) =>
        accountVariables.test(name)
      )
    ),
    stdinHash: await stdinHash(),
  })}\n`
)

if (failOn !== "" && line.startsWith(failOn)) {
  console.error(`fake wrangler: ${line} fails here`)
  process.exit(3)
}
if (line.startsWith("whoami --json")) {
  console.log(
    JSON.stringify({
      loggedIn: true,
      accounts: has("two-accounts")
        ? [
            { name: "Production", id: "0123456789abcdef0123456789abcdef" },
            { name: "Sandbox", id: "fedcba9876543210fedcba9876543210" },
          ]
        : [{ name: "Production", id: "0123456789abcdef0123456789abcdef" }],
    })
  )
}
if (line.startsWith("r2 bucket info") && !has("r2")) {
  process.exit(1)
}
if (line.startsWith("d1 info") && !has("d1")) {
  process.exit(1)
}
if (line.startsWith("secret list")) {
  if (has("secret-list-fails")) {
    console.error("fake wrangler: the API refused the list")
    process.exit(1)
  }
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
