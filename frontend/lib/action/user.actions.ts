'use client'
import { auth } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User,
} from 'firebase/auth'
import { storeAuthToken, clearAuthToken } from '@/lib/auth-cookie'
import { updateMe, syncAuthSession } from '@/lib/api/client'
import { getFirebaseAuthErrorMessage } from '../../../shared/firebaseAuthErrors'

const FIREBASE_NOT_CONFIGURED =
  'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to frontend/.env.local and restart the dev server.'

async function finishFirebaseLogin(user: User) {
  const token = await user.getIdToken()
  await storeAuthToken(token)
  try {
    await syncAuthSession()
  } catch (e) {
    console.warn('Backend sync after sign-in failed (API may be down):', e)
  }
}

async function oauthPopupOrRedirect(provider: GoogleAuthProvider | OAuthProvider) {
  if (!auth) throw new Error(FIREBASE_NOT_CONFIGURED)
  try {
    const cred = await signInWithPopup(auth, provider)
    return cred.user
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(getFirebaseAuthErrorMessage(error, 'Sign-in was cancelled.'))
    }
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider)
      return null
    }
    throw error
  }
}

export async function completeOAuthRedirect() {
  if (!auth) return null
  const result = await getRedirectResult(auth)
  if (!result?.user) return null
  await finishFirebaseLogin(result.user)
  return result.user
}

export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const user = await oauthPopupOrRedirect(provider)
    if (!user) return null
    await finishFirebaseLogin(user)
    return user
  } catch (error: unknown) {
    console.error('Google sign-in error:', error)
    throw new Error(getFirebaseAuthErrorMessage(error, 'Google sign-in failed'))
  }
}

export const signInWithApple = async () => {
  try {
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')
    const user = await oauthPopupOrRedirect(provider)
    if (!user) return null
    await finishFirebaseLogin(user)
    return user
  } catch (error: unknown) {
    console.error('Apple sign-in error:', error)
    throw new Error(getFirebaseAuthErrorMessage(error, 'Apple sign-in failed'))
  }
}

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
      await finishFirebaseLogin(userCredential.user)
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
