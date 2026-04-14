'use client'
import { auth } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { setCookie, deleteCookie } from 'cookies-next'
import { updateMe } from '@/lib/api/client'

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
    if (!auth) return null
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    // Update display name via backend after successful registration
    try {
      await updateMe({ name: `${firstName} ${lastName}` })
    } catch {
      // Non-fatal: backend may not be available at registration time
    }
    return userCredential.user
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

export const signIn = async ({ email, password }: { email: string; password: string }) => {
  try {
    if (!auth) return null
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    // Store Firebase ID token in cookie for middleware auth checks
    try {
      const token = await userCredential.user.getIdToken()
      setCookie('auth_token', token, { maxAge: 60 * 60 })
    } catch {
      // Non-fatal: middleware will redirect to sign-in if cookie missing
    }
    return userCredential.user
  } catch (error) {
    console.error('Error signing in:', error)
    return null
  }
}

export const signOut = async () => {
  try {
    if (auth) await firebaseSignOut(auth)
    deleteCookie('auth_token')
  } catch (error) {
    console.error('Error signing out:', error)
  }
}
