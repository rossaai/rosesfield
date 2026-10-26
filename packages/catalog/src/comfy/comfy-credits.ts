export const comfyCreditsPerUsd = 211

export const autoRunLimitCredits = comfyCreditsPerUsd

export function creditsOfCost(cost: { amount: number }): number {
  return cost.amount * comfyCreditsPerUsd
}
