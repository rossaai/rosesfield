import { approvedExamples, motionApp } from "@rosesfield/catalog/motion"
import { describe, expect, it } from "vitest"
import {
  examplesGateways,
  mcp,
  parsedMotion,
  pngOf,
  refused,
  upload,
} from "../fixtures/examples-gateway"

describe("the refusals of a Library example through the gateway", () => {
  const openGateway = examplesGateways()

  it("refuses an example the server does not offer, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      example: "melt-away",
      photo: [photo],
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses the clip's sound, which an example does not take, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const error = await refused(gateway, {
      example: "push-into-eye",
      photo: [photo],
      sound: "off",
    })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses a run with no photo, and starts nothing", async () => {
    const error = await refused(openGateway(), { example: "push-into-eye" })
    expect(error.code).toBe("RUN_INPUT_INVALID")
  })

  it("refuses an example the server does not offer through /mcp, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const result = await mcp(gateway, "tools/call", {
      name: "motion",
      arguments: { inputs: { example: "melt-away", photo: [photo] } },
    })
    expect(result).toMatchObject({ isError: true })
    expect(JSON.stringify(result)).toContain("inputs.example")
    expect(gateway.jobs.enqueued).toEqual([])
  })
})

describe("an example's final through /mcp", () => {
  const openGateway = examplesGateways()

  it("waits for the person's yes at 720p, and with no resolution, and starts nothing", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    for (const inputs of [
      { example: "push-into-eye", photo: [photo], resolution: "720p" },
      { example: "push-into-eye", photo: [photo] },
    ]) {
      const result = await mcp(gateway, "tools/call", {
        name: "motion",
        arguments: { inputs },
      })
      expect(result).toMatchObject({ isError: true })
      expect(JSON.stringify(result)).toContain("RUN_NEEDS_YES")
    }
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("starts the 480p draft at once, the control", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const result = await mcp(gateway, "tools/call", {
      name: "motion",
      arguments: {
        inputs: {
          example: "push-into-eye",
          photo: [photo],
          resolution: "480p",
        },
      },
    })
    expect(result.isError).not.toBe(true)
    expect(gateway.jobs.enqueued).toHaveLength(1)
  })
})

describe("the shape a Motion run records through /mcp", () => {
  const openGateway = examplesGateways()

  it("is the example's own shape, 2:3 for Grab and run", async () => {
    const gateway = openGateway(parsedMotion(motionApp(approvedExamples)))
    const photo = await upload(gateway, pngOf(1080, 1920))
    const result = await mcp(gateway, "tools/call", {
      name: "motion",
      arguments: {
        inputs: { example: "grab-and-run", photo: [photo], resolution: "480p" },
      },
    })
    expect(JSON.stringify(result)).toContain('"aspectRatio":"2:3"')
  })

  it("is the photo's own shape with your own video on LTX 2.3 control, 9:16 for a 1080 by 1920 photo, the control", async () => {
    const gateway = openGateway()
    const photo = await upload(gateway, pngOf(1080, 1920))
    const clip = await upload(gateway, Uint8Array.of(0, 0, 0, 24), "video/mp4")
    const result = await mcp(gateway, "tools/call", {
      name: "motion",
      arguments: {
        inputs: { model: "ltx-2-3-control", photo: [photo], clip: [clip] },
      },
    })
    expect(JSON.stringify(result)).toContain('"aspectRatio":"9:16"')
  })
})
