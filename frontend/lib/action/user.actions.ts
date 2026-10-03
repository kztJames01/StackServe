'use client'
import { auth } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { storeAuthToken, clearAuthToken } from '@/lib/auth-cookie'
import { updateMe } from '@/lib/api/client'
import { getFirebaseAuthErrorMessage } from '../../../shared/firebaseAuthErrors'

const FIREBASE_NOT_CONFIGURED =
  'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to frontend/.env.local and restart the dev server.'

export const createUser = async ({
  firstName,
  lastName,
  email,
  password,
}: {
  firstName: string
  lastName: string
  email: string
  password: string
}) => {
  try {
    if (!auth) throw new Error(FIREBASE_NOT_CONFIGURED)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const token = await userCredential.user.getIdToken()
      await storeAuthToken(token)
    } catch {
      // cookie optional at signup
    }
    try {
      await updateMe({ name: `${firstName} ${lastName}` })
    } catch (e) {
      console.warn('Profile sync failed after sign-up (API may be down):', e)
    }
    return userCredential.user
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    throw new Error(getFirebaseAuthErrorMessage(error, 'Sign up failed'))
  }
}

export const signIn = async ({ email, password }: { email: string; password: string }) => {
  try {
    if (!auth) throw new Error(FIREBASE_NOT_CONFIGURED)
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    try {
      const token = await userCredential.user.getIdToken()
      await storeAuthToken(token)
    } catch {
      throw new Error('Signed in but could not save session cookie. Try again or clear site data.')
    }
    return userCredential.user
  } catch (error: unknown) {
    console.error('Error signing in:', error)
    throw new Error(getFirebaseAuthErrorMessage(error, 'Sign in failed'))
  }
}

export const signOut = async () => {
  try {
    if (auth) await firebaseSignOut(auth)
    clearAuthToken()
  } catch (error) {
    console.error('Error signing out:', error)
  }
}
