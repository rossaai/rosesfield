import type { Clock } from "@rosesfield/kernel"
import { AccountLookups } from "#session/account-lookups"
import type { ComfyAccount } from "#session/comfy-account"
import { KeyProbe } from "#session/key-probe"
import { KeyReadings } from "#session/key-readings"

export type PublicAccountParts = {
  accounts: AccountLookups
  readings: KeyReadings
  early: (request: Request, key: string) => void
}

export function publicAccountParts(
  account: ComfyAccount,
  clock: Clock
): PublicAccountParts {
  const accounts = new AccountLookups({
    lookup: (key) => account.idOf(key),
    clock,
  })
  const readings = new KeyReadings({
    probe: new KeyProbe({
      account,
      accountOf: (key) => accounts.answerFor(key),
    }),
  })
  return {
    accounts,
    readings,
    early: (request, key) => readings.start(request, key),
  }
}
