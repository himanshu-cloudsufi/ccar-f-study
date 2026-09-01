// Hash routing, no router library.
//
// Two hash forms are accepted:
//   • canonical — `#/learn/<guideId>`, `#/learn/<guideId>/<headingSlug>`,
//     `#/test`, `#/cards`
//   • legacy bare `#<headingSlug>` — what the outline links in
//     GuideRenderer render; read as "a section in the currently active guide",
//     scrolled to, then normalized to the canonical form in place.
// Anything else falls back to `#/learn/<first guide>`.

import { useCallback, useEffect, useRef, useState } from "react"
import { guides } from "@/data/guides"

export type Mode = "learn" | "test" | "cards"

export interface Route {
  mode: Mode
  guideId: string
  /** Heading slug within the active guide, when the URL names one. */
  section?: string
}

const DEFAULT_GUIDE = guides[0].id
const guideIds = new Set(guides.map((g) => g.id))

export function parseHash(raw: string, activeGuideId: string): Route {
  const s = raw.startsWith("#") ? raw.slice(1) : raw
  if (!s) return { mode: "learn", guideId: activeGuideId }

  if (!s.startsWith("/")) {
    return { mode: "learn", guideId: activeGuideId, section: s }
  }

  const parts = s.slice(1).split("/").filter(Boolean)
  if (parts[0] === "test" || parts[0] === "cards") {
    return { mode: parts[0], guideId: activeGuideId }
  }
  if (parts[0] === "learn") {
    const guideId = parts[1] && guideIds.has(parts[1]) ? parts[1] : DEFAULT_GUIDE
    return { mode: "learn", guideId, section: parts[2] }
  }
  return { mode: "learn", guideId: DEFAULT_GUIDE }
}

export function toHash(r: Route): string {
  if (r.mode !== "learn") return `#/${r.mode}`
  return r.section
    ? `#/learn/${r.guideId}/${r.section}`
    : `#/learn/${r.guideId}`
}

function replaceHash(hash: string): void {
  try {
    history.replaceState(null, "", `${location.pathname}${location.search}${hash}`)
  } catch {
    // History API blocked — the un-normalized hash is still routable.
    location.hash = hash
  }
}

function scrollToRoute(section: string | undefined): void {
  // Wait for the guide to paint before looking for the heading.
  requestAnimationFrame(() => {
    const el = section ? document.getElementById(section) : null
    if (el) el.scrollIntoView()
    else window.scrollTo({ top: 0 })
  })
}

/**
 * The single source of truth for mode + active guide. The hash is the state:
 * `navigate` writes it (one history entry per mode/guide change) and the
 * hashchange listener reads it back, so browser back/forward just works.
 */
export function useRoute(): {
  route: Route
  navigate: (patch: Partial<Route>) => void
} {
  const [route, setRoute] = useState<Route>(() =>
    parseHash(location.hash, DEFAULT_GUIDE)
  )
  // Mirrors `route` for the hashchange listener and `navigate`; every setRoute
  // below updates both, so it is never read during render.
  const routeRef = useRef(route)

  useEffect(() => {
    const onHash = () => {
      const next = parseHash(location.hash, routeRef.current.guideId)
      routeRef.current = next
      setRoute(next)
      const canonical = toHash(next)
      if (location.hash !== canonical) replaceHash(canonical)
    }
    onHash() // normalize whatever we were loaded with
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  useEffect(() => {
    if (route.mode !== "learn") return
    scrollToRoute(route.section)
  }, [route.mode, route.guideId, route.section])

  // A patch without `section` clears it: switching guide or mode starts at the top.
  const navigate = useCallback((patch: Partial<Route>) => {
    const next: Route = { ...routeRef.current, section: undefined, ...patch }
    const hash = toHash(next)
    if (location.hash === hash) {
      routeRef.current = next
      setRoute(next)
      return
    }
    location.hash = hash // hashchange picks it up
  }, [])

  return { route, navigate }
}
