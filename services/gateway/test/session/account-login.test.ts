import { routes, runPageResponse } from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { keyHeaders } from "#session/visitor-keys"
import { accountPath } from "../fixtures/comfy-fetch"
import {
  finishedRun,
  type OpenedGateway,
  openGateway,
} from "../fixtures/public-gateway"
import type { Visitor } from "../fixtures/visitor"

const firstKey = "comfyui-key1--sameaccount"
const secondKey = "comfyui-key2--sameaccount"
const otherKey = "comfyui-key3-otheraccount"

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

async function runIds(visitor: Visitor): Promise<string[]> {
  const page = runPageResponse.parse(
    await (await visitor.call(routes.listRuns.path)).json()
  )
  return page.runs.map((run) => run.id)
}

describe("your Comfy key as your login", () => {
  it("opens the same work on a second device and with a new key of the same account", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    const run = await finishedRun(laptop, "a red door")

    const phone = opened.visitor({ [keyHeaders.engine]: firstKey })
    const rotated = opened.visitor({ [keyHeaders.engine]: secondKey })
    const stranger = opened.visitor({ [keyHeaders.engine]: otherKey })

    expect(await runIds(phone)).toEqual([run.id])
    expect(await runIds(rotated)).toEqual([run.id])
    expect(await runIds(stranger)).toEqual([])
  })

  it("asks Comfy for the account once per key, and reads the library with the cookie alone", async () => {
    opened = openGateway()
    const laptop = opened.visitor({ [keyHeaders.engine]: firstKey })
    const run = await finishedRun(laptop, "a red door")
    await laptop.call(routes.listRuns.path)

    const lookups = opened.comfy.calls.filter(
      (call) => call.path === accountPath
    )
    expect(lookups).toHaveLength(1)
    expect(await runIds(laptop.withoutKeys())).toEqual([run.id])
  })

  it("keeps the work made before the key under the account the key opens", async () => {
    opened = openGateway()
    const before = opened.visitor()
    const made = await finishedRun(before, "a blue door")
    const after = before.withoutKeys()
    const keyed = opened.visitor({ [keyHeaders.engine]: firstKey })
    keyed.cookie = after.cookie

    expect(await runIds(keyed)).toEqual([made.id])
    expect(
      await runIds(opened.visitor({ [keyHeaders.engine]: secondKey }))
    ).toEqual([made.id])
  })

  it("keeps a refused key out of every account", async () => {
    opened = openGateway()
    const owner = opened.visitor({ [keyHeaders.engine]: firstKey })
    await finishedRun(owner, "a red door")

    const refused = opened.visitor({
      [keyHeaders.engine]: "comfyui-refused-sameaccount",
    })

    expect(await runIds(refused)).toEqual([])
  })
})
