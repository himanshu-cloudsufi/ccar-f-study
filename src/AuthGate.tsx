import type { Session } from "@supabase/supabase-js"
import { useEffect, useState, type ReactNode } from "react"
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
  getSession,
  isAllowedEmail,
  onAuthStateChange,
  signInWithOtp,
} from "@/lib/leaderboard"

/** Live auth session: "loading" until the first check resolves. */
export function useSession(): Session | null | "loading" {
  const [session, setSession] = useState<Session | null | "loading">("loading")
  useEffect(() => {
    getSession().then(setSession)
    return onAuthStateChange(setSession)
  }, [])
  return session
}

/** Full-page sign-in screen shown while there is no session. */
export function SignInScreen() {
  const [email, setEmail] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [error, setError] = useState("")

  const sendLink = async () => {
    const trimmed = email.trim()
    if (!isAllowedEmail(trimmed)) {
      setState("error")
      setError(`Use your work email — it must end in ${ALLOWED_DOMAIN}.`)
      return
    }
    setState("sending")
    setError("")
    const err = await signInWithOtp(trimmed)
    if (err) {
      setState("error")
      setError(err)
    } else {
      setState("sent")
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🎓</span> CCAR-F Study Hub
          </CardTitle>
          <CardDescription>
            Exam prep for Claude Certified Architect – Foundations. Sign in
            with your {ALLOWED_DOMAIN} email to continue — no password, we
            email you a link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state === "sent" ? (
            <p className="text-sm">
              📬 Check your email — we sent a sign-in link to{" "}
              <span className="font-medium">{email.trim()}</span>. Open it in
              this browser and you'll land here signed in.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendLink()}
                  placeholder={`you${ALLOWED_DOMAIN}`}
                  autoComplete="email"
                  autoFocus
                  className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  onClick={sendLink}
                  disabled={!email.trim() || state === "sending"}
                >
                  {state === "sending" ? "Sending…" : "Send magic link"}
                </Button>
              </div>
              {state === "error" && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Gates children behind a session; shows the sign-in screen otherwise. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession()
  if (session === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center text-sm text-muted-foreground">
        Checking sign-in…
      </div>
    )
  }
  if (session === null) return <SignInScreen />
  return <>{children}</>
}
