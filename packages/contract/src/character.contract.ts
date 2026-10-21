import { z } from "zod"
import { assetId, characterId } from "#id.contract"
import { timestamp } from "#value.contract"

export const characterReferenceMax = 16

export const character = z.object({
  id: characterId,
  name: z.string().regex(/\S/).max(80),
  references: z.array(assetId).min(1).max(characterReferenceMax),
  notes: z.string().max(2000),
  createdAt: timestamp,
})

export const createCharacterBody = z.strictObject({
  name: character.shape.name,
  references: character.shape.references,
  notes: character.shape.notes,
})

export const updateCharacterBody = createCharacterBody.partial()

export type Character = z.infer<typeof character>
export type CreateCharacterBody = z.infer<typeof createCharacterBody>
export type UpdateCharacterBody = z.infer<typeof updateCharacterBody>
