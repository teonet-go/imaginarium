
// src/app/actions.ts
'use server';

import { refinePrompt as refinePromptFlow, type RefinePromptInput, type RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { generateImage as generateImageAiFlow, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { refineImage as refineImageAiFlow, type RefineImageInput, type RefineImageOutput } from '@/ai/flows/refine-image-flow';
import type { S3Config } from '@/lib/s3-config';
import * as Minio from 'minio';
import { 
  saveS3ConfigToFirebase, 
  loadS3ConfigFromFirebase, 
  deleteS3ConfigFromFirebase,
  loadS3ConfigFromLocalStorage // Keep for fallback
} from '@/lib/s3-config'; 
import type { User } from 'firebase/auth';


export interface GeneratedImage {
  id: string;
  url: string; // Can be a regular URL or a data URI
  prompt: string;
  alt: string;
  name: string; // For filename
  aiHint?: string;
}

export async function handleRefinePrompt(originalPrompt: string): Promise<RefinePromptOutput> {
  if (!originalPrompt.trim()) {
    return { refinedPrompt: '', suggestedPrompts: [] };
  }
  const input: RefinePromptInput = { originalPrompt };
  try {
    // Simulate network latency - remove if not needed
    // await new Promise(resolve => setTimeout(resolve, 500)); 
    const result = await refinePromptFlow(input);
    return result;
  } catch (error) {
    console.error("Error refining prompt:", error);
    // Return a structure that indicates failure but doesn't break the UI
    return {
      refinedPrompt: `Could not refine: ${originalPrompt}`,
      suggestedPrompts: [],
    };
  }
}

export async function handleGenerateImage(prompt: string): Promise<GeneratedImage> {
  const imageId = `${Date.now()}-${prompt.substring(0, 10).replace(/\s/g, '_')}`;
  const promptWords = prompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');

  try {
    const input: GenerateImageInput = { prompt };
    const result: GenerateImageOutput = await generateImageAiFlow(input);

    return {
      id: imageId,
      url: result.imageDataUri,
      prompt: prompt,
      alt: `AI generated image for prompt: ${prompt}`,
      name: prompt, // Set name from prompt for new images
      aiHint: aiHint
    };
  } catch (error) {
    console.error("Error generating image with Genkit AI:", error);
    // Fallback to a placeholder image on error
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Generating`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: prompt,
      alt: `Error generating image for prompt: ${prompt}. Placeholder shown.`,
      name: prompt, // Still set name from prompt even on error
      aiHint: aiHint
    };
  }
}

export async function handleRefineExistingImage(originalImage: GeneratedImage, refinementPrompt: string): Promise<GeneratedImage> {
  const imageId = `${Date.now()}-refined-${refinementPrompt.substring(0, 10).replace(/\s/g, '_')}`;
  const promptWords = refinementPrompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');
  
  // Ensure originalImage.url is a data URI before attempting refinement
  if (!originalImage.url.startsWith('data:')) {
    console.error("Error: Original image for refinement is not a data URI.");
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Refining`;
    return {
      id: imageId, // Use new ID for the error/fallback state
      url: fallbackImageUrl,
      prompt: originalImage.prompt, // Keep original prompt
      alt: `Error refining image. Original image was not a data URI. Placeholder shown. Original prompt: '${originalImage.prompt}'.`,
      name: originalImage.name || '', // Keep original name
      aiHint: aiHint, // Use new AI hint based on refinement attempt
    };
  }
  
  try {
    const input: RefineImageInput = { originalImageDataUri: originalImage.url, refinementPrompt };
    const result: RefineImageOutput = await refineImageAiFlow(input);

    return {
      id: imageId, // Use new ID for the refined image
      url: result.imageDataUri,
      prompt: originalImage.prompt, // Keep original prompt
      alt: `AI-refined image. Original prompt: '${originalImage.prompt}'. Refinement instructions: '${refinementPrompt}'.`,
      name: originalImage.name || '', // Keep original name
      aiHint: aiHint // Use new AI hint
    };
  } catch (error) {
    console.error("Error refining image with Genkit AI:", error);
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Refining`;
    return {
      id: imageId, // Use new ID for the error/fallback state
      url: fallbackImageUrl,
      prompt: originalImage.prompt, // Keep original prompt
      alt: `Error refining image. Original prompt: '${originalImage.prompt}'. Attempted refinement: '${refinementPrompt}'. Placeholder shown.`,
      name: originalImage.name || '', // Keep original name
      aiHint: aiHint // Use new AI hint
    };
  }
}


// Helper function to get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png': return '.png';
    case 'image/jpeg': return '.jpeg';
    case 'image/jpg': return '.jpg';
    case 'image/gif': return '.gif';
    case 'image/webp': return '.webp';
    case 'image/svg+xml': return '.svg';
    default: return '.png'; // Default to .png if unknown or not an image
  }
}


export async function handleSaveS3Config(
  userId: string,
  config: S3Config,
): Promise<{ success: boolean; message: string }> {
  console.log(`[SettingsForm Server Action] Attempting to save S3 config for user ${userId}`);
  try {
    await saveS3ConfigToFirebase(userId, config);
    console.log(`[SettingsForm Server Action] S3 config saved successfully for user ${userId}.`);
    return { success: true, message: 'S3 configuration saved to cloud successfully.' };
  } catch (error: any) {
    console.error(`[SettingsForm Server Action] Error saving S3 config to Firebase for user ${userId}:`, error);
    return { success: false, message: `Failed to save S3 configuration: ${error.message}` };
  }
}

export async function handleLoadS3Config(
  userId: string,
): Promise<{ success: boolean; message: string; config?: S3Config | null }> {
   console.log(`[SettingsForm Server Action] Attempting to load S3 config for user ${userId}`);
  try {
    const loadedConfig = await loadS3ConfigFromFirebase(userId);
    if (loadedConfig) {
      console.log(`[SettingsForm Server Action] S3 config loaded successfully for user ${userId}.`);
      return { success: true, message: 'S3 configuration loaded from cloud.', config: loadedConfig };
    } else {
      console.log(`[SettingsForm Server Action] No S3 config found for user ${userId}.`);
      return { success: true, message: 'No S3 configuration found in cloud.', config: null };
    }
  } catch (error: any) {
    console.error(`[SettingsForm Server Action] Error loading S3 config from Firebase for user ${userId}:`, error);
    return { success: false, message: `Failed to load S3 configuration: ${error.message}` };
  }
}

export async function handleDeleteS3Config(
  userId: string,
): Promise<{ success: boolean; message: string }> {
  console.log(`[SettingsForm Server Action] Attempting to delete S3 config for user ${userId}`);
  try {
    await deleteS3ConfigFromFirebase(userId);
    console.log(`[SettingsForm Server Action] S3 config deleted successfully for user ${userId}.`);
    return { success: true, message: 'S3 configuration deleted from cloud.' };
  } catch (error: any) {
     console.error(`[SettingsForm Server Action] Error deleting S3 config from Firebase for user ${userId}:`, error);
    return { success: false, message: `Failed to delete S3 configuration: ${error.message}` };
  }
}


export async function handleUploadImageToS3(
  image: GeneratedImage,
  s3Config: S3Config | null // Allow s3Config to be null if not loaded
): Promise<{ success: boolean; message: string; url?: string }> {
  
  if (!s3Config) { // Check if s3Config is null first
    // Attempt to load from localStorage as a fallback
    // This part is tricky because Server Actions don't have direct access to localStorage.
    // For now, we'll just state that config needs to be provided.
    // In a real app, the client would fetch/decrypt config and pass it to the action,
    // or the action would fetch it if stored server-side (e.g., encrypted in Firestore per user).
    console.warn("[S3 Upload] S3 configuration was not provided. Cannot upload to S3.");
    // Try to load from localStorage as a last resort (only works if this code somehow runs client-side or was bundled with client code for an RSC that calls it)
    // This is generally not reliable for server actions.
    const localConfig = loadS3ConfigFromLocalStorage(); // This will likely not work as expected in a pure server action
    if (localConfig) {
        s3Config = localConfig;
        console.warn("[S3 Upload] Using S3 configuration from local storage fallback. This is not recommended for production server actions. Cloud-saved settings are unencrypted if this method is used.");
    } else {
        return { success: false, message: 'S3 configuration not available. Please configure S3 settings.' };
    }
  }

  console.log(`Attempting to upload image "${image.name}" to S3 bucket "${s3Config.bucketName}" with prefix "${s3Config.prefix}".`);

  if (!image.url.startsWith('data:image')) {
    return { success: false, message: 'Image is not a valid data URI and cannot be uploaded.' };
  }

  if (!s3Config.url || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) { 
     return { success: false, message: 'S3 configuration (URL, Access Key, Secret Key, Bucket Name) is incomplete. Please check settings.' };
  }
  
  if (!image.name || image.name.trim() === '') {
    return { success: false, message: 'Image name is required for S3 upload. Please provide a name.' };
  }

  let s3ServiceUrl: URL;
  try {
    let fullUrl = s3Config.url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `http://${fullUrl}`; // Default to http if no scheme
    }
    s3ServiceUrl = new URL(fullUrl);
  } catch (e) {
    return { success: false, message: `Invalid S3 URL format: ${s3Config.url}. Error: ${(e as Error).message}` };
  }

  const endPoint = s3ServiceUrl.hostname;
  let portNum: number;
  if (s3ServiceUrl.port) {
    portNum = parseInt(s3ServiceUrl.port, 10);
    if (isNaN(portNum)) {
      return { success: false, message: `Invalid port in S3 URL: ${s3ServiceUrl.port}` };
    }
  } else {
    portNum = s3ServiceUrl.protocol === 'https:' ? 443 : 80;
  }
  const useSSL = s3ServiceUrl.protocol === 'https:';

  try {
    const minioClient = new Minio.Client({
      endPoint,
      port: portNum,
      useSSL,
      accessKey: s3Config.accessKeyId,
      secretKey: s3Config.secretAccessKey,
    });

    const dataUriMatches = image.url.match(/^data:(image\/.+?);base64,(.+)$/);
    if (!dataUriMatches || dataUriMatches.length !== 3) {
      return { success: false, message: 'Invalid image data URI format for S3 upload.' };
    }
    const mimeType = dataUriMatches[1];
    const base64Data = dataUriMatches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const baseName = image.name.trim();
    const extension = getExtensionFromMimeType(mimeType);
    
    let fileNameWithExtension = baseName;
    if (!baseName.toLowerCase().endsWith(extension.toLowerCase())) {
        fileNameWithExtension = baseName + extension;
    }

    let s3ObjectKey = fileNameWithExtension;
    if (s3Config.prefix && s3Config.prefix.trim() !== '') {
      const normalizedPrefix = s3Config.prefix.endsWith('/') ? s3Config.prefix : `${s3Config.prefix}/`;
      s3ObjectKey = `${normalizedPrefix}${s3ObjectKey}`.replace(/^\/+/, '');
    }
    if (s3ObjectKey.startsWith('/')) {
        s3ObjectKey = s3ObjectKey.substring(1);
    }

    console.log(`[S3 Upload] Uploading to bucket: ${s3Config.bucketName}, key: ${s3ObjectKey}, mime: ${mimeType}`);
    await minioClient.putObject(s3Config.bucketName, s3ObjectKey, imageBuffer, {
      'Content-Type': mimeType,
    });
    console.log(`[S3 Upload] Upload successful for key: ${s3ObjectKey}`);

    const uploadedFileUrl = `${s3ServiceUrl.protocol}//${s3ServiceUrl.host}${s3ServiceUrl.port && ![80,443].includes(portNum) ? ':'+portNum : ''}/${s3Config.bucketName}/${s3ObjectKey}`;
    
    return { 
      success: true, 
      message: `Image "${fileNameWithExtension}" uploaded successfully to S3.`,
      url: uploadedFileUrl
    };

  } catch (error: any) {
    console.error("[S3 Upload] Error uploading to MinIO S3 compatible storage:", error);
    let errorMessage = 'Failed to upload image to S3.';
    if (error.code) {
        switch (error.code) {
            case 'NoSuchBucket':
                errorMessage = `Bucket "${s3Config.bucketName}" does not exist.`;
                break;
            case 'AccessDenied':
                errorMessage = `Access denied for S3 bucket "${s3Config.bucketName}". Check credentials, permissions, and bucket policy.`;
                break;
            case 'ECONNREFUSED':
                errorMessage = `Connection refused. Ensure S3 service at ${s3Config.url} is reachable.`;
                break;
            default:
                errorMessage = `S3 Upload Error (${error.code}): ${error.message || 'An unknown S3 error occurred.'}`;
        }
    } else if (error.message) {
      errorMessage = `S3 Upload Error: ${error.message}`;
    }
    return { success: false, message: errorMessage };
  }
}

    