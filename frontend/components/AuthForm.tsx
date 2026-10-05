'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowRight, Loader2, LockKeyhole, UserRound } from 'lucide-react'
import { Button } from './ui/button'
import { Form } from './ui/form'
import { authFormSchema } from '@/lib/utils'
import CustomInput from './CustomInput'
import {
  signIn,
  createUser,
  signInWithGoogle,
  signInWithApple,
  completeOAuthRedirect,
} from '@/lib/action/user.actions'
import { auth } from '@/lib/firebase'
import { getAuthConfig, type AuthConfig } from '@/lib/api/client'
import { Card, CardContent } from './ui/card'
import { ThemeToggle } from './theme-provider'

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function AppleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-current">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}

const AuthForm = ({ type }: AuthFormProps) => {
  const router = useRouter()
  const [loading, setIsLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  const formSchema = authFormSchema(type)

  useEffect(() => {
    getAuthConfig()
      .then(setAuthConfig)
      .catch(() => setAuthConfig({ google: true, apple: true, authMode: 'unknown' }))
  }, [])

  useEffect(() => {
    if (!auth) return
    completeOAuthRedirect()
      .then((user) => {
        if (user) router.push('/dashboard')
      })
      .catch((err: unknown) => {
        setAuthError(err instanceof Error ? err.message : 'Sign-in could not be completed')
      })
  }, [router])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setAuthError(null)
    if (!auth) {
      setAuthError('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* vars to frontend/.env.local and restart the dev server.')
      return
    }
    setIsLoading(true)
    try {
      if (type === 'sign-up') {
        await createUser({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email,
          password: data.password,
        })
        router.push('/sign-in')
      } else {
        await signIn({
          email: data.email,
          password: data.password,
        })
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const runOAuth = async (which: 'google' | 'apple') => {
    setAuthError(null)
    if (!auth) {
      setAuthError('Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* vars to frontend/.env.local and restart the dev server.')
      return
    }
    setOauthLoading(which)
    try {
      const user = which === 'google' ? await signInWithGoogle() : await signInWithApple()
      if (user) router.push('/dashboard')
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setOauthLoading(null)
    }
  }

  const showGoogle = authConfig?.google !== false
  const showApple = authConfig?.apple !== false
  const showOAuth = showGoogle || showApple

  return (
    <section className="flex-center min-h-screen w-full px-4 py-[5vh] sm:px-6 lg:px-8">
      <div className="fixed right-4 top-4 z-30 rounded-full border bg-card"><ThemeToggle /></div>
      <Card className="w-full max-w-[460px] lg:max-w-6xl overflow-hidden border border-border bg-card/88 shadow-[0_30px_80px_rgba(37,36,34,0.12)] backdrop-blur-sm">
        <CardContent className="grid p-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <div className="auth-form relative w-full border-b border-border bg-card/72 lg:border-b-0 lg:border-r lg:border-border">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#bb9457] to-transparent" />
            <header className="flex flex-col gap-5 md:gap-8">
              <Link href="/" className="mb-2 flex cursor-pointer items-center gap-3">
                <Image src="/logo/mobile-logo1.png" width={34} height={34} alt="SynthPass logo" className="max-xl:size-14 dark:invert" />
                <h1 className="text-24 px-1 font-bold text-foreground">SynthPass</h1>
              </Link>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-foreground/70">
                {type === 'sign-in' ? <LockKeyhole size={14} /> : <UserRound size={14} />}
                <span>{type === 'sign-in' ? 'Agency access' : 'Create agency workspace'}</span>
              </div>
              <div className="flex flex-col gap-2 md:gap-3">
                <h1 className="text-24 lg:text-36 font-semibold text-foreground">
                  {type === 'sign-in' ? 'Sign in to SynthPass' : 'Create your SynthPass account'}
                </h1>
                <p className="text-16 font-[family-name:var(--font-antonio)] uppercase tracking-[0.08em] text-foreground/72">
                  {type === 'sign-in' ? 'Access your agency workspaces' : 'Set up your first agency workspace'}
                </p>
              </div>
            </header>

            {authError ? (
              <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {authError}
              </p>
            ) : null}

            {showOAuth ? (
              <div className="mb-6 space-y-3">
                {showGoogle ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2 bg-background"
                    disabled={!!oauthLoading || loading}
                    onClick={() => runOAuth('google')}
                  >
                    {oauthLoading === 'google' ? <Loader2 className="size-4 animate-spin" /> : <GoogleMark />}
                    Continue with Google
                  </Button>
                ) : null}
                {showApple ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center gap-2 bg-background"
                    disabled={!!oauthLoading || loading}
                    onClick={() => runOAuth('apple')}
                  >
                    {oauthLoading === 'apple' ? <Loader2 className="size-4 animate-spin" /> : <AppleMark />}
                    Continue with Apple
                  </Button>
                ) : null}
                <div className="flex items-center gap-3 pt-1">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">or use email</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            ) : null}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 font-[family-name:var(--font-geist-mono)]">
                {type === 'sign-up' ? (
                  <>
                    <CustomInput control={form.control} name="firstName" label="First Name" placeholder="Enter your first name" />
                    <CustomInput control={form.control} name="lastName" label="Last Name" placeholder="Enter your last name" />
                    <CustomInput control={form.control} name="email" type="email" label="Email" placeholder="Enter your email" />
                    <CustomInput control={form.control} name="password" type="password" label="Password" placeholder="Enter your password" />
                    <CustomInput control={form.control} name="confirmPassword" type="password" label="Confirm Password" placeholder="Confirm your password" />
                  </>
                ) : (
                  <>
                    <CustomInput control={form.control} name="email" type="email" label="Email" placeholder="Enter your email" />
                    <CustomInput control={form.control} name="password" type="password" label="Password" placeholder="Enter your password" />
                  </>
                )}

                <Button type="submit" disabled={loading} className="form-btn w-full">
                  {loading ? (
                    <>
                      <Loader2 size={20} className="mr-3 animate-spin" /> Loading...
                    </>
                  ) : type === 'sign-in' ? (
                    <>
                      Sign In
                      <ArrowRight size={16} />
                    </>
                  ) : (
                    <>
                      Sign Up
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <footer className="mt-6 space-y-3 text-center">
              <p className="flex flex-wrap justify-center gap-1">
                <span className="text-sm font-normal text-foreground/70">
                  {type === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'}
                </span>
                <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
                  {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
                </Link>
              </p>
              <p className="text-xs text-foreground/70">
                <Link href="/help/terms" className="underline">Terms of Service</Link>
                <span> · </span>
                <Link href="/help/privacy-policy" className="underline">Privacy Policy</Link>
              </p>
            </footer>
          </div>

          <div className="relative hidden min-h-[320px] bg-muted lg:block">
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#252422]/30 via-transparent to-[#bb9457]/35" />
            <div className="absolute left-6 top-6 z-20 max-w-sm rounded-[1.5rem] border border-border bg-secondary/95 p-4 text-secondary-foreground backdrop-blur-md lg:left-8 lg:top-8">
              <p className="text-xs uppercase tracking-[0.18em] text-secondary-foreground/80">Build with conviction</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight">Book a shoot, clear a digital replica rider, and keep the session fee on record.</h2>
            </div>
            <Image
              src="/home.jpg"
              alt="Auth visual"
              fill
              sizes="50vw"
              className="object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default AuthForm
