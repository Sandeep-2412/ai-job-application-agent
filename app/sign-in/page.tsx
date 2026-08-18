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

function SignInForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard"
  const authError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(
    authError === "auth" ? "Authentication failed. Please try again." : null
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    window.location.href = redirectTo
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to track applications, manage your pipeline, and let AI help you land your next role."
    >
      <Card className="border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Sign in
          </CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                  className="h-10"
                />
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Button
                type="submit"
                className="h-10 w-full text-sm"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </FieldGroup>
          </form>

          <FieldSeparator className="my-6">or continue with</FieldSeparator>

          <GoogleSignInButton redirectTo={redirectTo} disabled={loading} />
        </CardContent>
        <CardFooter className="px-0 pb-0">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={`/sign-up${redirectTo !== "/dashboard" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignInForm />
    </Suspense>
  )
}
