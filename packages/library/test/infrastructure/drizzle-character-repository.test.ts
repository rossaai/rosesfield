import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { Character } from "#domain/character"
import { libraryFor, start } from "../harness"

const photo = assetIdFormat.parse("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f")
const other = assetIdFormat.parse("6a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d")

function characterWith(references: (typeof photo)[]): Character {
  return Character.create({
    id: characterIdFormat.parse(crypto.randomUUID()),
    name: "Mara",
    references,
    notes: "",
    now: start,
  })
}

describe("DrizzleCharacterRepository", () => {
  it("finds the characters that keep an asset as a reference", async () => {
    const { characters } = libraryFor()
    const both = characterWith([photo, other])
    const one = characterWith([other])
    await characters.add(both)
    await characters.add(one)
    expect(
      (await characters.listUsing(photo)).map((found) => found.id)
    ).toEqual([both.id])
    expect(await characters.listUsing(other)).toHaveLength(2)
  })

  it("stores the changes of a character", async () => {
    const { characters } = libraryFor()
    const character = characterWith([photo])
    await characters.add(character)
    character.change({ references: [other], notes: "Green coat" })
    await characters.save(character)
    expect((await characters.get(character.id))?.toRecord()).toEqual(
      character.toRecord()
    )
    expect(await characters.listUsing(photo)).toEqual([])
  })
})
