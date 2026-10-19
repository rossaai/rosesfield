import {
  appIdFormat,
  assetIdFormat,
  characterIdFormat,
  runIdFormat,
} from "@rosesfield/kernel"
import { z } from "zod"

export const appId = z
  .string()
  .regex(appIdFormat.pattern)
  .refine(appIdFormat.is)

export const runId = z
  .string()
  .regex(runIdFormat.pattern)
  .refine(runIdFormat.is)

export const assetId = z
  .string()
  .regex(assetIdFormat.pattern)
  .refine(assetIdFormat.is)

export const characterId = z
  .string()
  .regex(characterIdFormat.pattern)
  .refine(characterIdFormat.is)
