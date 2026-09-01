// Theme preference: "system" follows the OS, "light"/"dark" pin it.
// Every localStorage access is guarded — the app must stay fully usable when
// storage is unavailable (private mode, storage disabled, quota full).
//
// The initial class is set by an inline script in index.html so there is no
// flash of the wrong palette; this module must agree with that script.

const KEY = "ccarf-theme"

export type Theme = "system" | "light" | "dark"

export const themes: Theme[] = ["system", "light", "dark"]

function isTheme(v: unknown): v is Theme {
  return v === "system" || v === "light" || v === "dark"
}

export function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(KEY)
    return isTheme(raw) ? raw : "system"
  } catch {
    return "system"
  }
}

function saveTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // Storage unavailable — the theme still applies for this session.
  }
}

function prefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  } catch {
    return false
  }
}

/** Resolve a preference to the class that should be on <html>. */
export function resolveTheme(t: Theme): "light" | "dark" {
  return t === "system" ? (prefersDark() ? "dark" : "light") : t
}

function apply(t: Theme): void {
  document.documentElement.classList.toggle("dark", resolveTheme(t) === "dark")
}

// ─── Store ────────────────────────────────────────────────────────────────────

let current: Theme = loadTheme()
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

// A single OS listener for the whole app; it only matters while "system".
try {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", () => {
    if (current !== "system") return
    apply(current)
    emit()
  })
} catch {
  // matchMedia missing — "system" then resolves to light and never changes.
}

export function getTheme(): Theme {
  return current
}

export function setTheme(t: Theme): void {
  current = t
  saveTheme(t)
  apply(t)
  emit()
}

export function cycleTheme(): void {
  setTheme(themes[(themes.indexOf(current) + 1) % themes.length])
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Re-assert the class on mount in case storage changed since the inline script. */
export function initTheme(): void {
  apply(current)
}
