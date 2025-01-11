import React from 'react';
import AuthForm from '@/components/AuthForm';

const SignUp = () => {
    //  debugging const user = await getLoggedInUser();
    return (
        <section className='flex-center size-full max-sm:px-6'>
            <AuthForm type='sign-up' />
        </section>
    )
};
