import type { Context } from "hono"

const unknownSlot = "unknown"
const ipv4Pattern = /^\d{1,3}(?:\.\d{1,3}){3}$/
const groupPattern = /^[0-9a-f]{1,4}$/
const mappedPattern = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/

function groupsOf(part: string): string[] {
  if (part === "") {
    return []
  }
  const groups = part.split(":")
  const last = groups.at(-1) ?? ""
  return ipv4Pattern.test(last) ? [...groups.slice(0, -1), "0", "0"] : groups
}

function ipv6GroupsOf(address: string): string[] | null {
  const halves = address.split("::")
  if (halves.length > 2) {
    return null
  }
  const head = groupsOf(halves[0] ?? "")
  const tail = groupsOf(halves[1] ?? "")
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) {
    return null
  }
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail]
  return groups.every((group) => groupPattern.test(group))
    ? groups.map((group) => Number.parseInt(group, 16).toString(16))
    : null
}

export function clientSlotOf(address: string | null): string {
  const bare = (address ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1")
    .split("%")[0]
  if (bare === undefined || bare === "") {
    return unknownSlot
  }
  if (!bare.includes(":")) {
    return bare
  }
  const mapped = mappedPattern.exec(bare)?.[1]
  if (mapped !== undefined) {
    return mapped
  }
  const groups = ipv6GroupsOf(bare)
  return groups === null ? bare : `${groups.slice(0, 4).join(":")}::/64`
}

export function headerClientOf(name: string): (c: Context) => string | null {
  return (c) => {
    const value = c.req.header(name)
    if (value === undefined) {
      return null
    }
    const nearest = value.split(",").at(-1)?.trim() ?? ""
    return nearest === "" ? null : nearest
  }
}
