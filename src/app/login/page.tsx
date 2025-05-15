
// src/app/login/page.tsx
'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, LogIn, UserPlus, ChromeIcon, Mail } from 'lucide-react'; // Added Mail icon
import Link from 'next/link';
import LoadingSpinner from '@/components/layout/loading-spinner';
import { sendPasswordResetEmail } from 'firebase/auth'; // Import for password reset
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      router.push('/'); // Redirect if already logged in
    }
  }, [user, loading, router]);

  const handleEmailPasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const loggedInUser = await signInWithEmail(email, password);
    if (loggedInUser) {
      router.push('/');
    }
    setIsSubmitting(false);
  };

  const handleEmailPasswordSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const signedUpUser = await signUpWithEmail(email, password);
    if (signedUpUser) {
      // User is not redirected immediately after sign-up,
      // they need to verify their email first.
      // Toast message for verification is handled in signUpWithEmail.
    }
    setIsSubmitting(false);
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    // Redirection is handled by onAuthStateChanged or useEffect above
    // if Google sign-in is successful and user exists.
    setIsSubmitting(false); // Ensure this is set even if signInWithGoogle handles redirect
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to reset your password.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: `If an account exists for ${email}, a password reset link has been sent. Please check your inbox (and spam folder).`,
        duration: 9000,
      });
    } catch (error: any) {
      console.error("Password Reset Error:", error);
      if (error.code === 'auth/user-not-found') {
        toast({
          title: 'User Not Found',
          description: 'No account found for this email address. Please sign up if you are new.',
          variant: 'destructive',
        });
      } else if (error.code === 'auth/invalid-email') {
         toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address.',
          variant: 'destructive',
        });
      } 
       else {
        toast({
          title: 'Error Sending Reset Email',
          description: error.message || 'Failed to send password reset email. Please try again.',
          variant: 'destructive',
        });
      }
    }
    setIsSubmitting(false);
  };

  if (loading || (!loading && user)) { 
    return <LoadingSpinner text="Checking authentication..." />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="mb-8 text-center">
            <Link href="/" className="flex items-center justify-center group mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles h-12 w-12 text-primary mr-3 group-hover:animate-pulse"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                <h1 className="text-5xl font-bold tracking-tight text-foreground">
                    Imaginarium
                </h1>
            </Link>
            <p className="text-muted-foreground">Sign in or sign up to access your creative space.</p>
        </div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Login or Sign Up</CardTitle>
          <CardDescription>Enter your credentials or create a new account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="space-y-4"> {/* Removed onSubmit from form to handle actions separately */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="(at least 6 characters for sign up)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-1"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Updated onClick for signIn to avoid form submission */}
              <Button type="button" onClick={(e) => { e.preventDefault(); handleEmailPasswordSignIn(e);}} className="w-full sm:flex-1" disabled={isSubmitting || !email || !password}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
              {/* Updated onClick for signUp to avoid form submission */}
              <Button variant="outline" type="button" onClick={(e) => {e.preventDefault(); handleEmailPasswordSignUp(e);}} className="w-full sm:flex-1" disabled={isSubmitting || !email || !password}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Sign Up
              </Button>
            </div>
          </form>
          
          <Button variant="link" onClick={handlePasswordReset} className="px-0 text-sm text-muted-foreground hover:text-primary" disabled={isSubmitting || !email}>
            <Mail className="mr-2 h-4 w-4" />
            Forgot Password?
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground"> {/* Changed bg-background to bg-card for better appearance */}
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            {isSubmitting && user === null ? ( // Only show spinner if submitting for Google and not yet logged in
              <Loader2 className="animate-spin" />
            ) : (
              <ChromeIcon className="mr-2 h-5 w-5" />
            )}
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our imaginary Terms of Service.
        </CardFooter>
      </Card>
       <footer className="text-center py-6 text-xs text-muted-foreground mt-8">
        <p>&copy; {new Date().getFullYear()} Imaginarium. All rights reserved.</p>
      </footer>
    </div>
  );
}

