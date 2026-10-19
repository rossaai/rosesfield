export function thrownBy(action: () => unknown): unknown {
  try {
    action()
  } catch (error) {
    return error
  }
  return null
}
