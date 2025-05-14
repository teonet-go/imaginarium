// src/components/theme-provider.tsx
'use client';

import type { FC, ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'imaginarium-ui-theme',
  ...props
}) => {
  const [currentTheme, setCurrentThemeInternal] = useState<Theme>(() => {
    if (typeof window === 'undefined') {
      return defaultTheme;
    }
    try {
      const storedTheme = window.localStorage.getItem(storageKey) as Theme | null;
      return storedTheme || defaultTheme;
    } catch (e) {
      console.warn(`Failed to read theme from localStorage ('${storageKey}')`, e);
      return defaultTheme;
    }
  });

  // Effect to apply theme class and save to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme = currentTheme;
    if (currentTheme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    root.classList.add(effectiveTheme);

    try {
      window.localStorage.setItem(storageKey, currentTheme);
    } catch (e) {
       console.warn(`Failed to save theme to localStorage ('${storageKey}')`, e);
    }
  }, [currentTheme, storageKey]);

  // Effect to listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || currentTheme !== 'system') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    // Initial application if system theme is already set
    handleChange();
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [currentTheme]);

  const value = {
    theme: currentTheme,
    setTheme: (newTheme: Theme) => {
      setCurrentThemeInternal(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
