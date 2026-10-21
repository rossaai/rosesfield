import type { ModelField } from "@rosesfield/catalog/comfy"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { type ReactNode, useCallback, useState } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { characterQuery } from "@/api/queries"
import type { FieldValue } from "@/screens/app/app-form"
import type { AppForm, FormSource } from "@/screens/app/use-app-form"
import { useCharacterReferences } from "@/studio/image/use-character-references"
import { useReferenceTray } from "@/studio/image/use-reference-tray"

type MediaField = Extract<ModelField, { kind: "media" }>

const characterId = "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e01"

const photos = [
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c01",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c02",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c03",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c04",
  "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c05",
]

function mediaField(name: string, max: number): MediaField {
  return {
    name,
    path: name,
    required: false,
    kind: "media",
    media: "image",
    min: 0,
    max,
  }
}

function wrapper({ children }: { children: ReactNode }): ReactNode {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  client.setQueryData(characterQuery(characterId).queryKey, {
    character: {
      id: characterId,
      name: "Mara",
      references: photos,
      notes: "",
      createdAt: "2026-10-17T09:00:00.000Z",
    },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

type Props = { field: MediaField | null; source: FormSource }

function useImage({ field, source }: Props) {
  const [inputs, setInputs] = useState<Record<string, FieldValue>>({})
  const setInput = useCallback((name: string, value: FieldValue) => {
    setInputs((current) => ({ ...current, [name]: value }))
  }, [])
  const form: AppForm = {
    values: { inputs, seedMode: "random", count: 1, aspectRatio: null },
    source,
    problems: new Map(),
    setInput,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
  const tray = useReferenceTray(field, form)
  useCharacterReferences(characterId, form, tray)
  return inputs
}

afterEach(cleanup)

describe("a character opened in Image", () => {
  it("holds the photos while the chosen model takes no reference, and fills the references of the model you pick up to its limit", async () => {
    const { result, rerender } = renderHook(useImage, {
      wrapper,
      initialProps: { field: null, source: "placed" } as Props,
    })
    await new Promise((done) => setTimeout(done, 0))
    expect(result.current).toEqual({})
    rerender({ field: mediaField("images", 10), source: "placed" })
    await waitFor(() => expect(result.current.images).toEqual(photos))
    rerender({ field: mediaField("references", 3), source: "placed" })
    await waitFor(() =>
      expect(result.current.references).toEqual(photos.slice(0, 3))
    )
  })

  it("waits for the form to finish seeding before it places the photos", async () => {
    const { result, rerender } = renderHook(useImage, {
      wrapper,
      initialProps: {
        field: mediaField("images", 10),
        source: "defaults",
      } as Props,
    })
    await new Promise((done) => setTimeout(done, 0))
    expect(result.current.images).toBeUndefined()
    rerender({ field: mediaField("images", 10), source: "placed" })
    await waitFor(() => expect(result.current.images).toEqual(photos))
  })
})
