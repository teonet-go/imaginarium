// src/app/settings/page.tsx
import type { Metadata } from 'next';
import Header from '@/components/layout/header';
import S3SettingsForm from '@/components/settings/s3-settings-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings - Imaginarium',
  description: 'Configure S3 storage settings for image uploads.',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Imaginarium
            </Link>
          </Button>
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">S3 Storage Settings</CardTitle>
            <CardDescription>
              Configure your S3 bucket details (e.g., MinIO) to enable uploading generated images.
              This includes Access Key, Secret Key, Bucket Name, and an optional Path Prefix.
              These settings are stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <S3SettingsForm />
          </CardContent>
        </Card>
      </main>
      <footer className="text-center py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Imaginarium. Settings.</p>
      </footer>
    </div>
  );
}
