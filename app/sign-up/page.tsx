"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AuthShell } from "@/components/auth/auth-shell"
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

function SignUpForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setMessage(
      "Check your email for a confirmation link to activate your account."
    )
    setLoading(false)
  }

  return (
    <AuthShell
      title="Start your job search smarter"
      subtitle="Create an account to organize applications, track progress, and get AI-powered help with every step."
    >
      <Card className="border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Create account
          </CardTitle>
          <CardDescription>
            Get started with email or sign up with Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Full name</FieldLabel>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Alex Johnson"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              {message ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {message}
                </p>
              ) : null}
              <Button
                type="submit"
                className="h-10 w-full text-sm"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </FieldGroup>
          </form>

          <FieldSeparator className="my-6">or continue with</FieldSeparator>

          <GoogleSignInButton redirectTo={redirectTo} disabled={loading} />
        </CardContent>
        <CardFooter className="px-0 pb-0">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/sign-in${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignUpForm />
    </Suspense>
  )
}
