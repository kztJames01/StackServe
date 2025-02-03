
import React from 'react';
import AuthForm from '@/components/AuthForm';
import ThreeDBackground from '@/components/AniBackground';

const SignUp = () => {
    //  debugging const user = await getLoggedInUser();
    return (
        <section className='flex-center size-full max-sm:px-6'>
            <ThreeDBackground/>
            <AuthForm type='sign-up' />
        </section>
    )
};

export default SignUp