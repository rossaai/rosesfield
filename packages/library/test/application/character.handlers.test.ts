import { character as characterSchema } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import { describe, expect, it } from "vitest"
import { libraryFor, uploadImage } from "../harness"

const missing = "7f6e5d4c-3b2a-4190-a8b7-c6d5e4f3a2b1"
const missingAsset = assetIdFormat.parse("0b8f3c2e-5a4d-4c1b-9e7f-2d6a8b9c0e1f")

describe("character use cases", () => {
  it("creates a character from images in the library", async () => {
    const library = libraryFor()
    const photo = await uploadImage(library)
    const { character } = await library.createCharacter.execute({
      name: "Mara",
      references: [photo],
      notes: "Short dark hair",
    })
    expect(characterSchema.parse(character)).toEqual(character)
    expect(
      (await library.getCharacter.execute({ characterId: character.id }))
        .character
    ).toEqual(character)
  })

  it("refuses a reference that is missing or not an image", async () => {
    const library = libraryFor()
    const { asset } = await library.upload.execute({
      bytes: Uint8Array.of(0, 0),
      mime: "audio/wav",
      sourceRunId: null,
      width: null,
      height: null,
      durationSeconds: 1,
    })
    for (const reference of [asset.id, missingAsset]) {
      await expect(
        library.createCharacter.execute({
          name: "Mara",
          references: [reference],
          notes: "",
        })
      ).rejects.toMatchObject({
        code: "CHARACTER_REFERENCE_INVALID",
        status: 400,
      })
    }
    expect((await library.listCharacters.execute()).characters).toEqual([])
  })

  it("lists characters newest first", async () => {
    const library = libraryFor()
    const photo = await uploadImage(library)
    for (const name of ["Mara", "Ilan"]) {
      await library.createCharacter.execute({
        name,
        references: [photo],
        notes: "",
      })
      library.clock.advance(1000)
    }
    const { characters } = await library.listCharacters.execute()
    expect(characters.map((character) => character.name)).toEqual([
      "Ilan",
      "Mara",
    ])
  })

  it("changes the name and checks new references", async () => {
    const library = libraryFor()
    const photo = await uploadImage(library)
    const second = await uploadImage(library)
    const { character } = await library.createCharacter.execute({
      name: "Mara",
      references: [photo],
      notes: "",
    })
    const updated = await library.updateCharacter.execute({
      characterId: character.id,
      changes: { name: "Mara Vel", references: [photo, second] },
    })
    expect(updated.character).toMatchObject({
      name: "Mara Vel",
      references: [photo, second],
      notes: "",
    })
    await expect(
      library.updateCharacter.execute({
        characterId: character.id,
        changes: { references: [missingAsset] },
      })
    ).rejects.toMatchObject({ code: "CHARACTER_REFERENCE_INVALID" })
    expect(
      (await library.getCharacter.execute({ characterId: character.id }))
        .character.references
    ).toEqual([photo, second])
  })

  it("deletes a character and frees its references", async () => {
    const library = libraryFor()
    const photo = await uploadImage(library)
    const { character } = await library.createCharacter.execute({
      name: "Mara",
      references: [photo],
      notes: "",
    })
    await library.deleteCharacter.execute({ characterId: character.id })
    await expect(
      library.getCharacter.execute({ characterId: character.id })
    ).rejects.toMatchObject({ code: "CHARACTER_NOT_FOUND", status: 404 })
    await library.deleteAsset.execute({ assetId: photo })
  })

  const steps: ("get" | "update" | "delete")[] = ["get", "update", "delete"]

  it.each(steps)(
    "refuses to %s a character that is not stored",
    async (step) => {
      const library = libraryFor()
      const actions = {
        get: () => library.getCharacter.execute({ characterId: missing }),
        update: () =>
          library.updateCharacter.execute({
            characterId: missing,
            changes: { notes: "x" },
          }),
        delete: () => library.deleteCharacter.execute({ characterId: missing }),
      }
      await expect(actions[step]()).rejects.toMatchObject({
        code: "CHARACTER_NOT_FOUND",
      })
    }
  )
})
