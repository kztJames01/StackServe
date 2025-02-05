'use client'

import React, { useState } from "react";
import Link from 'next/link';
import { redirect, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";
import {
    Form,
}
    from "./ui/form";
import { authFormSchema } from "@/lib/utils";
import CustomInput from "./CustomInput";
import { signIn, createUser } from "@/lib/action/user.actions";
import { Card, CardContent } from "./ui/card";
const AuthForm = ({ type }: AuthFormProps) => {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const [loading, setIsLoading] = useState(false);
    const formSchema = authFormSchema(type);
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(authFormSchema(type)),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
        }
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {
            if (type === 'sign-up') {
                const userData = {
                    firstName: data.firstName!,
                    lastName: data.lastName!,
                    email: data.email!,
                    password: data.password!,
                    confirmPassword: data.confirmPassword!,
                }
                const newUser = await createUser(userData);
                if (newUser) {
                    router.push('/sign-in');
                }
                else {
                    console.log('error');
                    redirect('/sign-up');
                }
            }
            if (type === 'sign-in') {
                const response = await signIn({
                    email: data.email!,
                    password: data.password!,
                });
                if (response) {
                    router.push("/dashboard");
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <section className='flex-center flex-col min-h-screen w-full'>
            <Card className="overflow-hidden">
                <CardContent className="grid p-0 md:grid-cols-2">
                    < div className="auth-form glassmorphism p-8 w-full" >
                        <header className='flex flex-col gap-5 md:gap-8'>
                            <Link href='/' className='flex mb-4  cursor-pointer items-center gap-2'>
                                <Image src="/logo/mobile-logo1.png" width={34} height={34} alt="NxtGen logo" className="size=[24px] max-xl:size-14" />
                                <h1 className=' font-bold text-24 font-robo text-primary px-4 '>NxtGen</h1>
                            </Link>
                            <div className='flex flex-col gap-1 md:gap-3 '>
                                <h1 className='text-24 lg:text-36 font-semibold text-primary'>
                                    {user ?
                                        'Link Account' : type === 'sign-in' ? 'Hop into the MakerSpace' : 'Start Your Jounrney'
                                    }
                                    <p className='text-16 font-normal text-secondary'>
                                        {user ?
                                            'Link your account to get started' : 'Please enter your details'}
                                    </p>
                                </h1>
                            </div>
                        </header>
                        {
                            user ?
                                (
                                    <div className='flex flex-col gap-4'>

                                    </div>
                                ) : (
                                    <>
                                        <Form {...form}>
                                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 font-[family-name:var(--font-geist-mono)]">
                                                {type === 'sign-up' && (
                                                    <>

                                                        <CustomInput control={form.control} name="firstName" label="First Name" placeholder="Enter your first name" />
                                                        <CustomInput control={form.control} name="lastName" label="Last Name" placeholder="Enter your last name" />

                                                        <CustomInput control={form.control} name="email" label="Email" placeholder="Enter your email" />
                                                        <CustomInput control={form.control} name="password" label="Password" placeholder="Enter your password" />
                                                        <CustomInput control={form.control} name="confirmPassword" label="Confirm Password" placeholder="Confirm your password" />
                                                    </>
                                                )}
                                                {type === 'sign-in' && (
                                                    <>
                                                        <CustomInput
                                                            control={form.control}
                                                            name="email"
                                                            label="Email"
                                                            placeholder="Enter your email"
                                                        />
                                                        <CustomInput
                                                            control={form.control}
                                                            name="password"
                                                            label="Password"
                                                            placeholder="Enter your password"
                                                        />
                                                    </>
                                                )}


                                                <Button type="submit" disabled={loading} className="form-btn w-full">
                                                    {loading ?
                                                        <>
                                                            <Loader2 size={20} className='animate-spin mr-3' /> &nbsp;
                                                            Loading...
                                                        </>
                                                        : type === 'sign-in' ? 'Sign In' : 'Sign Up'}
                                                </Button>

                                            </form>
                                        </Form>
                                        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                                            <span className="relative z-10 bg-background px-2 text-muted-foreground">
                                                Or continue with
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <Button variant="outline" className="w-full form-btn">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                    <path
                                                        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                                                        
                                                    />
                                                </svg>
                                                <span className="sr-only">Login with Apple</span>
                                            </Button>
                                            <Button variant="outline" className="w-full form-btn">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                    <path
                                                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                                        
                                                    />
                                                </svg>
                                                <span className="sr-only">Login with Google</span>
                                            </Button>
                                            <Button variant="outline" className="w-full form-btn">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                                    <path
                                                        d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"
                                                       
                                                    />
                                                </svg>
                                                <span className="sr-only">Login with Meta</span>
                                            </Button>
                                        </div>
                                        <footer className="flex justify-center gap-1">
                                            <p className='text-14 font-normal text-secondary'>
                                                {type === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'}
                                            </p>
                                            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className='form-link'>
                                                {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
                                            </Link>
                                        </footer>
                                    </>

                                )
                        }
                    </div >
                    <div className="relative hidden bg-muted md:block">
                        <img
                            src="/home.jpg"
                            alt="Image"
                            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
            <div className="text-balance mt-4 text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
                By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
                and <a href="#">Privacy Policy</a>.
            </div>
        </section>
    )
}

export default AuthForm


    