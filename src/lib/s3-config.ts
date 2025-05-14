// src/lib/s3-config.ts
'use client'; // Allow usage in client components for localStorage

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  prefix: string; // Changed from region to prefix
}

const S3_CONFIG_KEY = 's3ImaginariumConfig'; // Unique key for this app

export function saveS3Config(config: S3Config): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(S3_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error("Error saving S3 config to localStorage:", error);
      // Optionally, throw the error or notify the user, e.g., via a toast
      throw new Error("Failed to save S3 configuration to local storage. Storage might be full.");
    }
  }
}

export function loadS3Config(): S3Config | null {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem(S3_CONFIG_KEY);
    if (storedConfig) {
      try {
        // Ensure default for prefix if it's missing from old stored config
        const parsedConfig = JSON.parse(storedConfig) as Partial<S3Config>;
        return {
          accessKeyId: parsedConfig.accessKeyId || '',
          secretAccessKey: parsedConfig.secretAccessKey || '',
          bucketName: parsedConfig.bucketName || '',
          prefix: parsedConfig.prefix || '', // Provide default for prefix
        };
      } catch (e) {
        console.error("Error parsing S3 config from localStorage", e);
        // Corrupted data, remove it
        localStorage.removeItem(S3_CONFIG_KEY);
        return null;
      }
    }
  }
  return null;
}
