
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
import { Loader2, LogIn, UserPlus, ChromeIcon } from 'lucide-react'; // Using ChromeIcon as a generic Google icon
import Link from 'next/link';
import LoadingSpinner from '@/components/layout/loading-spinner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, loading, signInWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const router = useRouter();

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
      router.push('/');
    }
    setIsSubmitting(false);
  };
  
  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    await signInWithGoogle();
    // Redirection is handled by onAuthStateChanged or useEffect above
    setIsSubmitting(false);
  };

  if (loading || (!loading && user)) { // Show loading spinner if auth is loading or if user exists (and redirect is pending)
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
            <p className="text-muted-foreground">Sign in to continue to your creative space.</p>
        </div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Access your Imaginarium account or sign up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleEmailPasswordSignIn} className="space-y-4">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-1"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" className="w-full sm:flex-1" disabled={isSubmitting || !email || !password}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Sign In
              </Button>
              <Button variant="outline" onClick={handleEmailPasswordSignUp} className="w-full sm:flex-1" disabled={isSubmitting || !email || !password}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Sign Up
              </Button>
            </div>
          </form>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <ChromeIcon className="mr-2 h-5 w-5" /> // Using ChromeIcon for Google
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
