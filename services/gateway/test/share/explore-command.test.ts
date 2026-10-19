import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  buildPath,
  shareListResponse,
  shareResponse,
  shareRoutes,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { keyHeaders } from "#session/visitor-keys"
import {
  finishedRun,
  type OpenedGateway,
  openGateway,
} from "../fixtures/public-gateway"

const command = fileURLToPath(
  new URL("../../../../scripts/deploy/explore.ts", import.meta.url)
)

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

function place(dataDir: string, ...args: string[]) {
  return spawnSync("bun", [command, ...args, "--data-dir", dataDir], {
    encoding: "utf8",
  })
}

async function listedIds(gateway: OpenedGateway): Promise<string[]> {
  const list = shareListResponse.parse(
    await (await gateway.visitor().call("/share")).json()
  )
  return list.shares.map((share) => share.id)
}

describe("the operator's Explore command", () => {
  it("puts a shared output on Explore and takes it off again", async () => {
    opened = openGateway()
    const owner = opened.visitor({
      [keyHeaders.engine]: "comfyui-explore-key1",
    })
    const run = await finishedRun(owner, "a red door")
    const { share } = shareResponse.parse(
      await (
        await owner.call(
          buildPath(shareRoutes.shareRun.path, { runId: run.id }),
          { method: "POST" }
        )
      ).json()
    )

    const before = await listedIds(opened)
    const added = place(opened.dataDir, share.id)
    const listed = await listedIds(opened)
    const removed = place(opened.dataDir, share.id, "--remove")
    const after = await listedIds(opened)
    const refused = place(opened.dataDir, "x'; DROP TABLE shares; --")

    expect(before).toEqual([])
    expect(added.status).toBe(0)
    expect(listed).toEqual([share.id])
    expect(removed.status).toBe(0)
    expect(after).toEqual([])
    expect(refused.status).toBe(1)
    expect(await listedIds(opened)).toEqual([])
  })
})
