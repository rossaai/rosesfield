const numbers = new Intl.NumberFormat("en", { maximumFractionDigits: 2 })

export const shareCopy = {
  title: "Made with Rosesfield",
  exploreTitle: "Explore",
  exploreLine: "Results made with Rosesfield, on Comfy credits.",
  recreate: "Recreate",
  credits: (credits: number): string =>
    `${numbers.format(credits)} Comfy credits`,
  lockup: "Rosesfield",
}
