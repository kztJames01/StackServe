'use client'
import { auth } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { storeAuthToken, clearAuthToken } from '@/lib/auth-cookie'
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
    try {
      const token = await userCredential.user.getIdToken()
      await storeAuthToken(token)
    } catch {
      // cookie optional at signup
    }
    try {
      await updateMe({ name: `${firstName} ${lastName}` })
    } catch {
      // backend might be down
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
    try {
      const token = await userCredential.user.getIdToken()
      await storeAuthToken(token)
    } catch {
      // middleware needs cookie
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
    clearAuthToken()
  } catch (error) {
    console.error('Error signing out:', error)
  }
}
