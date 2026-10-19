import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { Character } from "#domain/character"
import { CharacterInvalidError } from "#domain/error/character-invalid.error"
import { start } from "../harness"

const photo = assetIdFormat.parse("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f")
const other = assetIdFormat.parse("6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d")

function mara(): Character {
  return Character.create({
    id: characterIdFormat.parse("7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1"),
    name: "Mara",
    references: [photo, other, photo],
    notes: "Short dark hair",
    now: start,
  })
}

describe("Character", () => {
  it("keeps each reference once, in the order given", () => {
    expect(mara().toRecord()).toEqual({
      id: "7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1",
      name: "Mara",
      references: [photo, other],
      notes: "Short dark hair",
      createdAt: "2026-10-17T09:00:00.000Z",
    })
  })

  it("changes only the fields it is given", () => {
    const character = mara()
    character.change({ notes: "Wears glasses" })
    expect(character.toRecord()).toMatchObject({
      name: "Mara",
      notes: "Wears glasses",
    })
  })

  it.each([
    { name: "  " },
    { name: "x".repeat(81) },
    { references: [] },
    { notes: "x".repeat(2001) },
  ])("refuses the change %j and keeps what it had", (changes) => {
    const character = mara()
    expect(() => character.change(changes)).toThrow(CharacterInvalidError)
    expect(character.toRecord().name).toBe("Mara")
  })

  it("refuses more than 16 references", () => {
    const many = Array.from({ length: 17 }, () =>
      assetIdFormat.parse(crypto.randomUUID())
    )
    expect(() => mara().change({ references: many })).toThrow(
      CharacterInvalidError
    )
  })
})
