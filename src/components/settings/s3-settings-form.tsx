// src/components/settings/s3-settings-form.tsx
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { saveS3Config, loadS3Config, type S3Config } from '@/lib/s3-config';
import { Save, RotateCcw } from 'lucide-react';

const initialS3Config: S3Config = {
  url: '',
  accessKeyId: '',
  secretAccessKey: '',
  bucketName: '',
  prefix: '', 
};

export default function S3SettingsForm() {
  const [s3Config, setS3Config] = useState<S3Config>(initialS3Config);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadedConfig = loadS3Config();
    if (loadedConfig) {
      setS3Config(loadedConfig);
    }
    setIsLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setS3Config((prevConfig) => ({
      ...prevConfig,
      [name]: value,
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      saveS3Config(s3Config);
      toast({
        title: 'Settings Saved',
        description: 'S3 configuration has been saved locally.',
      });
    } catch (error) {
      console.error('Failed to save S3 settings:', error);
      toast({
        title: 'Error Saving Settings',
        description: 'Could not save S3 configuration. Check console for details.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    const loadedConfig = loadS3Config();
    setS3Config(loadedConfig || initialS3Config);
    toast({
        title: 'Settings Reset',
        description: 'Form has been reset to the last saved S3 configuration.',
      });
  };
  
  if (isLoading) {
    return (
        <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
            <div className="h-10 bg-primary/50 rounded w-1/4 animate-pulse"></div>
        </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          type="text"
          value={s3Config.url}
          onChange={handleChange}
          placeholder="Your URL (entry point)"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="accessKeyId">Access Key ID</Label>
        <Input
          id="accessKeyId"
          name="accessKeyId"
          type="text"
          value={s3Config.accessKeyId}
          onChange={handleChange}
          placeholder="Your Access Key ID"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="secretAccessKey">Secret Access Key</Label>
        <Input
          id="secretAccessKey"
          name="secretAccessKey"
          type="password"
          value={s3Config.secretAccessKey}
          onChange={handleChange}
          placeholder="Your Secret Access Key"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="bucketName">S3 Bucket Name</Label>
        <Input
          id="bucketName"
          name="bucketName"
          type="text"
          value={s3Config.bucketName}
          onChange={handleChange}
          placeholder="Your S3 bucket name"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="prefix">S3 Path Prefix (Optional)</Label>
        <Input
          id="prefix"
          name="prefix" // Changed from region to prefix
          type="text"
          value={s3Config.prefix}
          onChange={handleChange}
          placeholder="e.g., images/generated/"
          className="mt-1"
        />
      </div>
      <div className="flex space-x-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> Save Settings
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Form
        </Button>
      </div>
    </form>
  );
}
