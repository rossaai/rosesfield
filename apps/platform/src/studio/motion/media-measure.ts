export const readLimitMs = 20_000

export type Measured = {
  assetId: string
  width: number | null
  height: number | null
  seconds: number | null
}

export function measureImage(
  src: string,
  done: (measured: Measured) => void
): () => void {
  const image = new Image()
  image.onload = () =>
    done({
      assetId: "",
      width: image.naturalWidth,
      height: image.naturalHeight,
      seconds: null,
    })
  image.onerror = () =>
    done({ assetId: "", width: null, height: null, seconds: null })
  image.src = src
  return () => {
    image.onload = null
    image.onerror = null
  }
}
