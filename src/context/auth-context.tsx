
// src/context/auth-context.tsx
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  type User as FirebaseUser,
  type AuthError
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<FirebaseUser | null>;
  signInWithEmail: (email: string, pass: string) => Promise<FirebaseUser | null>;
  signOutUser: () => Promise<void>;
  setUser: Dispatch<SetStateAction<FirebaseUser | null>>; // For direct manipulation if needed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthError = (error: AuthError, defaultMessage: string) => {
    console.error("Firebase Auth Error:", error);
    let message = defaultMessage;
    switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            message = 'Invalid email or password.';
            break;
        case 'auth/email-already-in-use':
            message = 'This email is already in use.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. It should be at least 6 characters.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Google Sign-In popup was closed. Please try again.';
            break;
        case 'auth/cancelled-popup-request':
             message = 'Google Sign-In was cancelled. Please try again.';
             break;
        default:
            message = error.message || defaultMessage;
    }
    toast({ title: 'Authentication Error', description: message, variant: 'destructive' });
  }

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user and loading state
      // router.push('/'); // Let onAuthStateChanged handle redirects from protected routes
    } catch (error) {
      handleAuthError(error as AuthError, 'Could not sign in with Google.');
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user
      return userCredential.user;
    } catch (error) {
      handleAuthError(error as AuthError, 'Could not sign up with email.');
      setLoading(false);
      return null;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting user
      return userCredential.user;
    } catch (error) {
      handleAuthError(error as AuthError, 'Could not sign in with email.');
      setLoading(false);
      return null;
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
      setUser(null); 
      router.push('/login'); // Explicitly redirect to login after sign out
    } catch (error) {
      handleAuthError(error as AuthError, 'Could not sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail, signOutUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
