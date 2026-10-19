const storageKey = "rosesfield.welcome"

export function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(storageKey) === "seen"
  } catch {
    return true
  }
}

export function markWelcomeSeen(): void {
  try {
    window.localStorage.setItem(storageKey, "seen")
  } catch {
    return
  }
}
