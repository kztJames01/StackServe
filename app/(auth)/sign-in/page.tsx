import React from 'react';
import AuthForm from '@/components/AuthForm';
import ThreeDBackground from '@/components/AniBackground';

const SignIn = () => {


    return (
        <section className='flex-center size-full max-sm:px-6'>
            <ThreeDBackground/>
            <AuthForm type='sign-in' />
            
        </section>
    )
};

export default SignIn;