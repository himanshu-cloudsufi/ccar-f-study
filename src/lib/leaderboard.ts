import { createClient, type Session } from "@supabase/supabase-js"

// Supabase-backed team leaderboard.
// Reads are anonymous (RLS "anon read"); writes require a signed-in
// @cloudsufi.com user (RLS "authenticated cloudsufi insert").
const SUPABASE_URL = "https://sajiuymlossqphtmavej.supabase.co"
const SUPABASE_KEY = "sb_publishable_tlDg2WThbns5XVxHMP_a4w_nkzvtVjh"
const ENDPOINT = `${SUPABASE_URL}/rest/v1/leaderboard`
const NAME_KEY = "ccarf-name"

export const ALLOWED_DOMAIN = "@cloudsufi.com"

// Defaults give us localStorage session persistence, auto refresh, and
// magic-link detection in the redirect URL.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export interface LeaderboardEntry {
  name: string
  mode: string
  score: number
  total: number
  percent: number
  scenarios: string | null
  created_at: string
}

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN)
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

export function setPlayerName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // storage unavailable — name just won't persist
  }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Subscribe to sign-in/sign-out; returns an unsubscribe function. */
export function onAuthStateChange(
  cb: (session: Session | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) =>
    cb(session)
  )
  return () => data.subscription.unsubscribe()
}

/** Email a magic link that returns the user to this app, signed in. */
export async function signInWithOtp(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  return error ? error.message : null
}

export async function signOut() {
  await supabase.auth.signOut()
}

/** Insert a score. user_id is filled server-side by the `auth.uid()` default. */
export async function postScore(entry: {
  name: string
  mode: string
  score: number
  total: number
  percent: number
  scenarios: string | null
}): Promise<string | null> {
  const { error } = await supabase.from("leaderboard").insert(entry)
  if (!error) return null
  // RLS rejection surfaces as a 42501 / "row-level security" error.
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return `Only signed-in ${ALLOWED_DOMAIN} accounts can post scores.`
  }
  return error.message || "Failed to submit — try again."
}

/** Top exam-simulation results, best attempt per person. Anonymous read. */
export async function fetchTop(limit = 10): Promise<LeaderboardEntry[] | null> {
  try {
    const res = await fetch(
      `${ENDPOINT}?select=name,mode,score,total,percent,scenarios,created_at` +
        `&order=percent.desc&order=created_at.asc&limit=200`,
      { headers: { apikey: SUPABASE_KEY } }
    )
    if (!res.ok) return null
    const rows: LeaderboardEntry[] = await res.json()
    const bestByName = new Map<string, LeaderboardEntry>()
    for (const r of rows) {
      const key = r.name.trim().toLowerCase()
      if (!bestByName.has(key)) bestByName.set(key, r)
    }
    return [...bestByName.values()].slice(0, limit)
  } catch {
    return null
  }
}
