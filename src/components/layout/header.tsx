
// src/components/layout/header.tsx
'use client';

import { Sparkles, Settings, LogOut, LogIn } from 'lucide-react';
import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/context/auth-context';
import { usePathname } from 'next/navigation';

const Header: FC = () => {
  const { user, loading, signOutUser } = useAuth();
  const pathname = usePathname();

  // Don't render header on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center group">
          <Sparkles className="h-10 w-10 text-primary mr-3 group-hover:animate-pulse" />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Imaginarium
          </h1>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading && user && (
            <>
              <Button variant="outline" size="icon" asChild>
                <Link href="/settings" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={signOutUser} aria-label="Sign Out">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}
          {!loading && !user && pathname !== '/login' && (
             <Button variant="outline" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
