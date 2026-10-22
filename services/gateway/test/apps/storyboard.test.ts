import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { keyframesOf, runKeyframes } from "@rosesfield/catalog/storyboard"
import {
  appDefinition,
  assetResponse,
  buildPath,
  characterResponse,
  errorEnvelope,
  type Run,
  routes,
  runPageResponse,
} from "@rosesfield/contract"
import {
  type AssetId,
  type CharacterId,
  FixedClock,
  runIdFormat,
} from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { composeLocalGateway, type LocalGateway } from "#compose/local-gateway"
import { app } from "../../../../packages/catalog/src/storyboard/app"
import { localEnv } from "../server-env"
import { askOf, type Call, GatewayChain, postJson } from "./storyboard-chain"

const startPath = buildPath(routes.startRun.path, { appId: "storyboard" })
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const localHost = { host: "127.0.0.1:8787" }

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe("a Storyboard run through the local gateway on the demo engine", () => {
  const clock = new FixedClock({ now: new Date("2026-10-17T09:00:00.000Z") })
  let folder = ""
  let gateway: LocalGateway

  afterEach(() => {
    gateway.jobs.stop()
    rmSync(folder, { recursive: true, force: true })
  })

  function open(): void {
    folder = mkdtempSync(join(tmpdir(), "rosesfield-storyboard-"))
    gateway = composeLocalGateway({
      env: localEnv(folder),
      apps: [appDefinition.parse(app)],
      clock,
      platformRoot: null,
    })
  }

  async function call(path: string, init: Call = {}): Promise<Response> {
    return gateway.app.request(path, {
      ...init,
      headers: { ...localHost, ...init.headers },
    })
  }

  async function drive(runId: string): Promise<void> {
    gateway.jobs.stop()
    for (let step = 0; step < 20; step += 1) {
      const { nextWakeMs } = await gateway.handlers.advanceRun.execute({
        runId: runIdFormat.parse(runId),
      })
      if (nextWakeMs === null) {
        return
      }
      clock.advance(nextWakeMs)
    }
    throw new Error(`Run ${runId} did not end in 20 steps`)
  }

  async function upload(): Promise<AssetId> {
    const response = await call(routes.uploadAsset.path, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: Uint8Array.of(...pngSignature, 0, 0, 0, 13),
    })
    expect(response.status).toBe(201)
    return assetResponse.parse(await response.json()).asset.id
  }

  function chain(): GatewayChain {
    return new GatewayChain({ call, drive })
  }

  async function listed(): Promise<Run[]> {
    const list = await call(routes.listRuns.path)
    return runPageResponse.parse(await list.json()).runs
  }

  async function expectKeyframeImage(run: Run, ratio: number): Promise<void> {
    expect(run.status).toBe("done")
    expect(run.count).toBe(1)
    expect(run.outputs).toHaveLength(1)
    const content = await call(
      buildPath(routes.readAssetContent.path, { assetId: run.outputs[0] ?? "" })
    )
    expect(content.headers.get("content-type")).toBe("image/png")
    const bytes = new Uint8Array(await content.arrayBuffer())
    expect([...bytes.slice(0, 8)]).toEqual(pngSignature)
    const size = pngSize(bytes)
    expect(Math.abs(size.width / size.height - ratio)).toBeLessThan(
      ratio * 0.02
    )
  }

  it("makes 3 keyframes from a reference as 3 runs started at once, keeps each in the library and records its inputs", async () => {
    open()
    const reference = await upload()
    const keyframes = chain()
    const runs = await runKeyframes({
      ask: askOf(
        [
          "a fox wakes in a den",
          "the fox crosses a frozen river",
          "the fox watches the town lights",
        ],
        { reference: [reference] }
      ),
      key: "storyboard-press-1",
      chain: keyframes,
    })
    expect(keyframes.events.slice(0, 3).map((one) => one.kind)).toEqual([
      "start",
      "start",
      "start",
    ])
    const ended = runs.filter((run): run is Run => run !== null)
    expect(new Set(ended.map((run) => run.id)).size).toBe(3)
    for (const [index, run] of ended.entries()) {
      await expectKeyframeImage(run, 16 / 9)
      expect(run).toMatchObject({
        appId: "storyboard",
        origin: "demo",
        aspectRatio: "16:9",
      })
      expect(run.inputs).toMatchObject({
        model: "qwen-image-edit-2511",
        sceneCount: "3",
        keyframe: String(index + 1),
        reference: [reference],
        scene2: "the fox crosses a frozen river",
        look: "blue hour, soft fog",
      })
      expect(keyframesOf(run).map((one) => one.number)).toEqual([index + 1])
    }
    const history = await listed()
    expect(history.filter((run) => run.appId === "storyboard")).toHaveLength(3)
  })

  it("makes keyframe 1 alone with no anchor, then edits keyframe 1 for the other scenes once it is done", async () => {
    open()
    const keyframes = chain()
    const runs = await runKeyframes({
      ask: askOf(
        [
          "a lighthouse at dawn",
          "a boat leaves the harbour",
          "the boat passes the lighthouse",
        ],
        {},
        "1:1"
      ),
      key: "storyboard-press-2",
      chain: keyframes,
    })
    expect(keyframes.events.slice(0, 2)).toEqual([
      { kind: "start", key: "storyboard-press-2-keyframe-1" },
      { kind: "end", key: "storyboard-press-2-keyframe-1" },
    ])
    const [first, second, third] = runs
    if (first === null || first === undefined) {
      throw new Error("keyframe 1 did not run")
    }
    await expectKeyframeImage(first, 1)
    expect(first.inputs).toMatchObject({
      model: "z-image-turbo",
      keyframe: "1",
    })
    for (const edit of [second, third]) {
      if (edit === null || edit === undefined) {
        throw new Error("an edit of keyframe 1 did not run")
      }
      await expectKeyframeImage(edit, 1)
      expect(edit.inputs).toMatchObject({
        model: "qwen-image-edit-2511",
        firstKeyframe: first.outputs,
      })
      expect(keyframesOf(edit)[0]?.anchor.kind).toBe("keyframe")
    }
    expect(await listed()).toHaveLength(3)
  })

  async function refused(body: unknown, key: string): Promise<void> {
    const response = await call(startPath, postJson(body, key))
    expect(response.status).toBe(400)
    const { error } = errorEnvelope.parse(await response.json())
    expect(error.code).toBe("RUN_INPUT_INVALID")
    const list = await call(routes.listRuns.path)
    expect(list.status).toBe(200)
    expect(JSON.stringify(await list.json())).not.toContain("storyboard")
  }

  async function accepted(body: unknown, key: string): Promise<void> {
    const response = await call(startPath, postJson(body, key))
    expect(response.status).toBe(202)
  }

  async function savedCharacter(): Promise<CharacterId> {
    const photo = await upload()
    const created = await call(routes.createCharacter.path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada", references: [photo], notes: "" }),
    })
    expect(created.status).toBe(201)
    return characterResponse.parse(await created.json()).character.id
  }

  it("makes one keyframe run per scene from a saved character", async () => {
    open()
    const character = await savedCharacter()
    const runs = await runKeyframes({
      ask: askOf(
        ["she opens a window", "she waters the plants"],
        { character: [character] },
        "9:16"
      ),
      key: "storyboard-press-4",
      chain: chain(),
    })
    expect(runs).toHaveLength(2)
    for (const run of runs) {
      if (run === null) {
        throw new Error("a keyframe did not run")
      }
      await expectKeyframeImage(run, 9 / 16)
      expect(run.inputs).toMatchObject({ character: [character] })
    }
  })

  it("refuses an edit of no anchor at all, and takes the text call for keyframe 1", async () => {
    open()
    const scenes = { sceneCount: "2", scene1: "a door", scene2: "a hall" }
    await refused({ inputs: scenes }, "storyboard-run-5")
    await refused(
      { inputs: { ...scenes, model: "z-image-turbo", keyframe: "2" } },
      "storyboard-run-5b"
    )
    await accepted(
      { inputs: { ...scenes, model: "z-image-turbo" } },
      "storyboard-run-5c"
    )
  })

  it("refuses a reference and a character together before a run starts", async () => {
    open()
    const reference = await upload()
    const character = await savedCharacter()
    await refused(
      {
        inputs: {
          reference: [reference],
          character: [character],
          scene1: "a door",
        },
      },
      "storyboard-run-6"
    )
    await accepted(
      { inputs: { character: [character], scene1: "a door" } },
      "storyboard-run-6b"
    )
  })

  it("refuses an empty scene inside the scene count, a scene past it and a keyframe past it", async () => {
    open()
    const text = { model: "z-image-turbo" }
    await refused(
      { inputs: { ...text, sceneCount: "2", scene1: "a door", scene2: " " } },
      "storyboard-run-7"
    )
    const hall = { scene1: "a door", scene2: "a hall" }
    await refused(
      { inputs: { ...text, ...hall, sceneCount: "1" } },
      "storyboard-run-8"
    )
    await refused(
      { inputs: { ...text, sceneCount: "1", scene1: "a door", keyframe: "2" } },
      "storyboard-run-8c"
    )
    await accepted(
      { inputs: { ...text, ...hall, sceneCount: "2" } },
      "storyboard-run-8b"
    )
  })

  it("refuses a run of more than one keyframe", async () => {
    open()
    const inputs = {
      model: "z-image-turbo",
      sceneCount: "2",
      scene1: "a door",
      scene2: "a hall",
    }
    await refused({ inputs, count: 2 }, "storyboard-run-9")
    await accepted({ inputs, count: 1 }, "storyboard-run-9b")
  })

  it("refuses a ninth keyframe before a run starts", async () => {
    open()
    await refused(
      { inputs: { scene1: "a door" }, count: 9 },
      "storyboard-run-2"
    )
  })

  it("refuses a scene longer than 500 characters before a run starts", async () => {
    open()
    await refused(
      { inputs: { scene1: "a".repeat(501) }, count: 1 },
      "storyboard-run-3"
    )
  })
})
