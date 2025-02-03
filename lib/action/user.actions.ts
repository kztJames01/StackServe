'use client'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'


export const createUser = async ({firstName, lastName, email, password} : 
    {firstName: string, lastName: string, email: string, password: string }) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}


export const signIn = async ({email, password} : {email: string, password: string}) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);        
        return null;
    }  
}