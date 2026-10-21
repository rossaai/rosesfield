import { readFile } from "node:fs/promises"
import type { EngineOutput } from "#domain/generation-engine.port"

export type VideoFixture = "melt-away-black" | "test-pattern"

async function fixtureOf(file: string): Promise<Uint8Array> {
  const url = new URL(`./fixtures/video/${file}`, import.meta.url)
  return new Uint8Array(await readFile(url))
}

export function videoBytesOf(name: VideoFixture): Promise<Uint8Array> {
  return fixtureOf(`${name}.mp4`)
}

export function stillsOf(name: VideoFixture): Promise<Uint8Array[]> {
  return Promise.all(
    [0, 1, 2, 3, 4].map((index) => fixtureOf(`${name}-${index}.png`))
  )
}

export function videoOutput(
  bytes: Uint8Array,
  stills?: readonly Uint8Array[]
): EngineOutput {
  return {
    kind: "video",
    mime: "video/mp4",
    bytes,
    width: 480,
    height: 854,
    durationSeconds: 7,
    ...(stills === undefined ? {} : { stills }),
  }
}
