import type { Fetch } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { ComfyAccount } from "#session/comfy-account"
import { KeyProbe } from "#session/key-probe"

type Answers = Partial<Record<keyof typeof urls, () => Response>>

const urls = {
  user: ComfyAccount.userUrl,
  balance: ComfyAccount.balanceUrl,
  jobs: ComfyAccount.jobUrl,
  catalog: ComfyAccount.catalogUrl,
}

const passing: Required<Answers> = {
  user: () => Response.json({ id: "uid-1", status: "active" }),
  balance: () => Response.json({ amount_cents: 1991 }),
  jobs: () => Response.json({ code: "job_not_found" }, { status: 404 }),
  catalog: () => Response.json({ models: [], has_more: false }),
}

function stubbed(answers: Answers): Fetch {
  const merged = { ...passing, ...answers }
  return async (input) => {
    const url = String(input instanceof Request ? input.url : input)
    const found = (Object.keys(urls) as (keyof typeof urls)[]).find(
      (name) => urls[name] === url
    )
    if (found === undefined) {
      throw new Error(`No answer for ${url}`)
    }
    return merged[found]()
  }
}

function probe(answers: Answers): Promise<unknown> {
  return new KeyProbe({
    account: new ComfyAccount({ fetch: stubbed(answers) }),
  }).read("comfyui-probe-key")
}

const refusal = (status: number, type: string, detail: string) => () =>
  Response.json({ detail }, { status, headers: { "x-comfy-error-type": type } })

describe("the key probe", () => {
  it("reads a working key's balance in Comfy credits, at 2.11 credits per cent", async () => {
    expect(await probe({})).toEqual({ key: "valid", credits: 4201.01 })
  })

  it("names a wrong key", async () => {
    expect(
      await probe({
        user: () => new Response(null, { status: 401 }),
        jobs: () => new Response(null, { status: 401 }),
        catalog: refusal(401, "unauthorized", "invalid key"),
        balance: () => new Response(null, { status: 401 }),
      })
    ).toEqual({ key: "wrong", credits: null })
  })

  it("names a key with no paid plan", async () => {
    expect(
      await probe({ jobs: () => new Response(null, { status: 429 }) })
    ).toEqual({ key: "no-plan", credits: null })
  })

  it("names a key made outside a workspace", async () => {
    expect(
      await probe({
        catalog: refusal(
          403,
          "not_enabled",
          "This API key does not belong to a workspace."
        ),
      })
    ).toEqual({ key: "outside-workspace", credits: null })
  })

  it("keeps a key valid when Comfy turned hosted models off without naming a workspace", async () => {
    expect(
      await probe({
        catalog: refusal(403, "not_enabled", "Comfy Router is not enabled"),
      })
    ).toEqual({ key: "valid", credits: 4201.01 })
  })

  it("says Comfy did not answer when no route answers", async () => {
    const offline: Fetch = async () => {
      throw new TypeError("fetch failed")
    }
    const reading = await new KeyProbe({
      account: new ComfyAccount({ fetch: offline }),
    }).read("comfyui-probe-key")
    expect(reading).toEqual({ key: "unreachable", credits: null })
  })
})
