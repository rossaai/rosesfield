import { describe, expect, it } from "vitest"
import {
  character,
  createCharacterBody,
  updateCharacterBody,
} from "#character.contract"
import { assetUuid, characterUuid } from "./sample"

const create = { name: "Mara", references: [assetUuid], notes: "" }

describe("character", () => {
  it("parses a character with its references and notes", () => {
    const parsed = character.parse({
      ...create,
      id: characterUuid,
      notes: "Short dark hair, green coat",
      createdAt: "2026-10-17T09:00:00.000Z",
    })
    expect(parsed.references).toEqual([assetUuid])
  })

  it.each([
    { ...create, name: "  " },
    { ...create, references: [] },
    { ...create, id: characterUuid },
  ])("refuses the create body %j", (body) => {
    expect(createCharacterBody.safeParse(body).success).toBe(false)
  })

  it("accepts an update that changes only the notes", () => {
    const update = updateCharacterBody.parse({ notes: "Wears glasses" })
    expect(update).toEqual({ notes: "Wears glasses" })
  })
})
