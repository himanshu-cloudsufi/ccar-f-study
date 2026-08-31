import type { Session } from "@supabase/supabase-js"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ALLOWED_DOMAIN,
  fetchTop,
  getPlayerName,
  getSession,
  isAllowedEmail,
  onAuthStateChange,
  postScore,
  setPlayerName,
  signInWithOtp,
  signOut,
  type LeaderboardEntry,
} from "@/lib/leaderboard"

/** Intro-screen card: team top scores (best exam-sim attempt per person). */
export function LeaderboardBoard() {
  const [rows, setRows] = useState<LeaderboardEntry[] | null | "loading">(
    "loading"
  )

  useEffect(() => {
    let alive = true
    fetchTop(10).then((r) => alive && setRows(r))
    return () => {
      alive = false
    }
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🏆 Team leaderboard</CardTitle>
        <CardDescription>
          Best exam-simulation result per person.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows === "loading" ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows === null ? (
          <p className="text-sm text-muted-foreground">
            Couldn't reach the leaderboard — check your connection.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scores yet. Finish an exam simulation and submit yours to open
            the board.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {rows.map((r, i) => (
              <li
                key={r.name + r.created_at}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="truncate font-medium">{r.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <Badge
                    variant={
                      r.percent >= 75
                        ? "default"
                        : r.percent >= 50
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {r.score}/{r.total} · {r.percent}%
                  </Badge>
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

/** Results-screen card: explicit opt-in submission of an exam-sim score. */
export function SubmitScore({
  score,
  total,
  scenarios,
}: {
  score: number
  total: number
  scenarios: string[] | null
}) {
  const [session, setSession] = useState<Session | null | "loading">("loading")
  const [email, setEmail] = useState("")
  const [authState, setAuthState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle")
  const [authError, setAuthError] = useState("")
  const [name, setName] = useState(getPlayerName())
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  )
  const [submitError, setSubmitError] = useState("")
  const percent = Math.round((score / total) * 100)

  useEffect(() => {
    getSession().then(setSession)
    return onAuthStateChange(setSession)
  }, [])

  // Once signed in, default the display name to the email's local part.
  const signedInEmail =
    session && session !== "loading" ? (session.user.email ?? "") : ""
  useEffect(() => {
    if (signedInEmail && !name.trim()) {
      setName(signedInEmail.split("@")[0])
    }
  }, [signedInEmail, name])

  const sendLink = async () => {
    const trimmed = email.trim()
    if (!isAllowedEmail(trimmed)) {
      setAuthState("error")
      setAuthError(`Use your work email — it must end in ${ALLOWED_DOMAIN}.`)
      return
    }
    setAuthState("sending")
    setAuthError("")
    const err = await signInWithOtp(trimmed)
    if (err) {
      setAuthState("error")
      setAuthError(err)
    } else {
      setAuthState("sent")
    }
  }

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setPlayerName(trimmed)
    setStatus("sending")
    setSubmitError("")
    const err = await postScore({
      name: trimmed,
      mode: "Exam simulation",
      score,
      total,
      percent,
      scenarios: scenarios?.join(",") ?? null,
    })
    if (err) {
      setStatus("error")
      setSubmitError(err)
    } else {
      setStatus("done")
    }
  }

  if (status === "done") {
    return (
      <Card className="border-green-500/50">
        <CardContent className="pt-6 text-sm">
          ✅ Score submitted to the team leaderboard as{" "}
          <span className="font-medium">{name.trim()}</span>.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🏆 Post to team leaderboard</CardTitle>
        <CardDescription>
          Share this exam-simulation result ({score}/{total} · {percent}%) with
          the team. Only submitted scores appear on the board.
        </CardDescription>
      </CardHeader>

      {session === "loading" ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">Checking sign-in…</p>
        </CardContent>
      ) : session === null ? (
        <CardContent className="flex flex-col gap-2">
          {authState === "sent" ? (
            <p className="text-sm">
              📬 Check your email — we sent a sign-in link to{" "}
              <span className="font-medium">{email.trim()}</span>. Open it in
              this browser and you'll come back here signed in.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Sign in with your {ALLOWED_DOMAIN} email to post a score. No
                password — we email you a link.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLink()}
                  placeholder={`you${ALLOWED_DOMAIN}`}
                  autoComplete="email"
                  className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={sendLink}
                  disabled={!email.trim() || authState === "sending"}
                >
                  {authState === "sending" ? "Sending…" : "Send magic link"}
                </Button>
              </div>
              {authState === "error" && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
            </>
          )}
        </CardContent>
      ) : (
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{signedInEmail}</span>{" "}
            <button
              type="button"
              onClick={() => {
                signOut()
                setAuthState("idle")
              }}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Sign out
            </button>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Display name"
              className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              onClick={submit}
              disabled={!name.trim() || status === "sending"}
            >
              {status === "sending" ? "Submitting…" : "Submit score"}
            </Button>
          </div>
          {status === "error" && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
