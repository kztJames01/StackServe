'use client'

import React , { useState } from "react";
import Link from 'next/link';
import { redirect,useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";
import {
    Form, }
    from "./ui/form";
import { authFormSchema } from "@/lib/utils";
import CustomInput from "./CustomInput";

const AuthForm = ({type}:{type:'sign-in' | 'sign-up'}) => {
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

    const onSubmit = async(data: z.infer<typeof formSchema>) => {
        setIsLoading(true);
        try {   
            if(type === 'sign-up') {
                const userData = {
                    firstName: data.firstName!,
                    lastName: data.lastName!,
                    email: data.email!,
                    password: data.password!,
                    confirmPassword: data.confirmPassword!,
                }
                const newUser = await signUp(userData);
                if (newUser) {
                    router.push('/sign-in');
                }
                else{
                    console.log('error');
                    redirect('/sign-up');
                }
            }
            if(type === 'sign-in') {
                const response = await signIn({
                    email: data.email!,
                    password: data.password!,
                });
                if(response) {
                    const loggedInUser = await getLoggedInUser();
                    setUser(loggedInUser);
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <section className='auth-form'>
            <header className='flex flex-col gap-5 md:gap-8'>
                <Link href='/' className='flex mb-12  cursor-pointer items-center gap-2'>
                    <Image src="/icons/logo.svg" width={34} height={34} alt="NxtGen logo" className="size=[24px] max-xl:size-14" />
                    <h1 className=' font-bold text-26 font-robo text-gray-900 px-4 '>NxtGen</h1>
                </Link>
                <div className='flex flex-col gap-1 md:gap-3 '>
                    <h1 className='text-24 lg:text-36 font-semibold text-gray-700'>
                        {user ?
                            'Link Account' : type === 'sign-in' ? 'Sign In' : 'Sign Up'
                        }
                        <p className='text-16 font-normal text-gray-600'>
                            {user ?
                                'Link your account to get started' : 'Please enter your details'}
                        </p>
                    </h1>
                </div>
            </header>
            {user ?
                (
                    <div className='flex flex-col gap-4'>
                        
                    </div>
                ) : (
                    <>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                {type === 'sign-up' && (
                                    <>
                                        <div className='flex gap-4'>
                                            <CustomInput control={form.control} name="firstName" label="First Name" placeholder="Enter your first name" />
                                            <CustomInput control={form.control} name="lastName" label="Last Name" placeholder="Enter your last name" />
                                        </div>
                                        <CustomInput control={form.control} name="email" label="Email" placeholder="Enter your email" />
                                        <CustomInput control={form.control} name="password" label="Password" placeholder="Enter your password" />
                                        <CustomInput control={form.control} name="confirmPassword" label="Confirm Password" placeholder="Confirm your password" />
                                    </>
                                )}
                                <CustomInput control={form.control} name="email" label="Email" placeholder="Enter your email" />
                                <CustomInput control={form.control} name="password" label="Password" placeholder="Enter your password" />


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
                        <footer className="flex justify-center gap-1">
                            <p className='text-14 font-normal text-gray-600'>
                                {type === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'}
                            </p>
                            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className='form-link'>
                                {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
                            </Link>
                        </footer>
                    </>

                )
            }
        </section>
    )
}

export default AuthForm