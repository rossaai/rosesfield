export const comfyCreditsPerUsd = 211

export function creditsOfCost(cost: { amount: number }): number {
  return cost.amount * comfyCreditsPerUsd
}
