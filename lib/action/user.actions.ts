'use client'
import { auth } from '@/lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'


export const createUser = async ({firstName, lastName, email, password} : 
    {firstName: string, lastName: string, email: string, password: string }) => {
    try {
        if (!auth) return null;
        void firstName;
        void lastName;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error creating user:', error);
        return null;
    }
}


export const signIn = async ({email, password} : {email: string, password: string}) => {
    try {
        if (!auth) return null;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error signing in:', error);        
        return null;
    }  
}
