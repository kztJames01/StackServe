'use client'

import React, { useState } from 'react'
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
import { signIn, createUser } from '@/lib/action/user.actions'
import { Card, CardContent } from './ui/card'

const AuthForm = ({ type }: AuthFormProps) => {
  const router = useRouter()
  const [loading, setIsLoading] = useState(false)
  const formSchema = authFormSchema(type)

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
    setIsLoading(true)
    try {
      if (type === 'sign-up') {
        const newUser = await createUser({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          email: data.email,
          password: data.password,
        })

        if (newUser) {
          router.push('/sign-in')
        }
      } else {
        const response = await signIn({
          email: data.email,
          password: data.password,
        })

        if (response) {
          router.push('/explore')
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="flex-center min-h-screen w-full px-4 py-[5vh] sm:px-6 lg:px-8">
      <Card className="w-full max-w-6xl overflow-hidden border border-[#d8c7ac] bg-white/88 shadow-[0_30px_80px_rgba(37,36,34,0.12)] backdrop-blur-sm">
        <CardContent className="grid p-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
          <div className="auth-form glassmorphism relative w-full border-b border-[#e6dccd] bg-white/72 lg:border-b-0 lg:border-r lg:border-[#e6dccd]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#bb9457] to-transparent" />
            <header className="flex flex-col gap-5 md:gap-8">
              <Link href="/" className="mb-2 flex cursor-pointer items-center gap-3">
                <Image src="/logo/mobile-logo1.png" width={34} height={34} alt="NxtGen logo" className="max-xl:size-14" />
                <h1 className="text-24 px-1 font-bold text-secondary">NxtGen</h1>
              </Link>
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-secondary/70">
                {type === 'sign-in' ? <LockKeyhole size={14} /> : <UserRound size={14} />}
                <span>{type === 'sign-in' ? 'Founder access' : 'Create founder profile'}</span>
              </div>
              <div className="flex flex-col gap-2 md:gap-3">
                <h1 className="text-24 lg:text-36 font-semibold text-secondary">
                  {type === 'sign-in' ? 'Hop into the MakerSpace' : 'Start Your Journey'}
                </h1>
                <p className="text-16 font-[family-name:var(--font-antonio)] uppercase tracking-[0.08em] text-secondary/72">
                  Please enter your details
                </p>
              </div>
            </header>

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

            <footer className="mt-6 flex flex-wrap justify-center gap-1 text-center">
              <p className="text-sm font-normal text-secondary/70">
                {type === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'}
              </p>
              <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
                {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
              </Link>
            </footer>
          </div>

          <div className="relative hidden min-h-[320px] bg-muted md:block">
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#252422]/30 via-transparent to-[#bb9457]/35" />
            <div className="absolute left-6 top-6 z-20 max-w-sm rounded-[1.5rem] border border-white/50 bg-white/18 p-4 text-white backdrop-blur-md lg:left-8 lg:top-8">
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">Build with conviction</p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight">Ship, recruit, and pitch from one founder workspace.</h2>
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
