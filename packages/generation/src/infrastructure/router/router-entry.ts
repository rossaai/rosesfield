import type { ModelForm } from "#domain/model-form"
import type {
  CatalogSource,
  KeptSchema,
} from "#infrastructure/router/drizzle-router-catalog-store"
import { fieldsOf } from "#infrastructure/router/router-fields"
import {
  type OutputPath,
  outputPathsOf,
} from "#infrastructure/router/router-output-paths"
import { factsOf, type SchemaFacts } from "#infrastructure/router/router-schema"

export type CatalogEntry = {
  facts: SchemaFacts
  form: ModelForm
  outputs: readonly OutputPath[]
  etag: string | null
  checkedAt: number
  source: CatalogSource
}

export function entryOf(schema: KeptSchema): CatalogEntry | null {
  const facts = factsOf(schema.document)
  if (facts === null || facts.model !== schema.model) {
    return null
  }
  return {
    facts,
    form: { model: schema.model, fields: fieldsOf(facts) },
    outputs: outputPathsOf(facts.response, facts.components),
    etag: schema.etag,
    checkedAt: schema.checkedAt,
    source: schema.source,
  }
}
