import type { Context } from "hono"
import { KeyHeaderInvalidError } from "#error/key-header-invalid.error"

export type VisitorKeys = {
  engine: string | null
}

export const keyHeaders = {
  engine: "x-engine-key",
}

const keyPattern = /^[\x21-\x7e]{1,1024}$/

function keyOf(c: Context, header: string): string | null {
  const value = c.req.header(header)
  if (value === undefined || value.trim() === "") {
    return null
  }
  if (!keyPattern.test(value)) {
    throw new KeyHeaderInvalidError({ header })
  }
  return value
}

export function readVisitorKeys(c: Context): VisitorKeys {
  return {
    engine: keyOf(c, keyHeaders.engine),
  }
}
