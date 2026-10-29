export type GuideFiles = {
  read: (file: string) => Promise<Uint8Array | null>
}

export const guidePath = "/effects/guides/"
