import { z } from "zod"

export const keyCheck = z.enum(["valid", "invalid", "unreachable"])

export type KeyCheck = z.infer<typeof keyCheck>
