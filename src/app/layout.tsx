
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Imaginarium',
  description: 'Generate and store images with AI',
};

const themeInitializationScript = `
(function() {
  const storageKey = 'imaginarium-ui-theme';
  const defaultTheme = 'system';
  let theme;
  try {
    theme = localStorage.getItem(storageKey) || defaultTheme;
  } catch (e) {
    // If localStorage is unavailable, fall back to default.
    theme = defaultTheme;
  }

  if (theme === 'system') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  } else if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    // Defaults to 'light' for unknown themes or explicit 'light'
    document.documentElement.classList.add('light');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning={true}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider defaultTheme="system" storageKey="imaginarium-ui-theme">
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
