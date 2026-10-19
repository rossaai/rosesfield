export type ThemeChoice = "system" | "light" | "dark"

const storageKey = "rosesfield.theme"
const choices: readonly ThemeChoice[] = ["system", "light", "dark"]

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(storageKey)
    return choices.find((choice) => choice === stored) ?? "system"
  } catch {
    return "system"
  }
}

export function applyThemeChoice(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === "system") {
    delete root.dataset.theme
  } else {
    root.dataset.theme = choice
  }
}

export function keepThemeChoice(choice: ThemeChoice): void {
  applyThemeChoice(choice)
  try {
    window.localStorage.setItem(storageKey, choice)
  } catch {
    return
  }
}
