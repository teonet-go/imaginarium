// src/app/actions.ts
'use server';

import { refinePrompt as refinePromptFlow, type RefinePromptInput, type RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { generateImage as generateImageAiFlow, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { refineImage as refineImageAiFlow, type RefineImageInput, type RefineImageOutput } from '@/ai/flows/refine-image-flow';
import type { S3Config } from '@/lib/s3-config';
import * as Minio from 'minio';
// Buffer is a global object in Node.js, no explicit import needed for Buffer.from

export interface GeneratedImage {
  id: string;
  url: string; // Can be a regular URL or a data URI
  prompt: string;
  alt: string;
  name: string; // For filename, will be empty by default for new images
  aiHint?: string;
}

export async function handleRefinePrompt(originalPrompt: string): Promise<RefinePromptOutput> {
  if (!originalPrompt.trim()) {
    return { refinedPrompt: '', suggestedPrompts: [] };
  }
  const input: RefinePromptInput = { originalPrompt };
  try {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
    const result = await refinePromptFlow(input);
    return result;
  } catch (error) {
    console.error("Error refining prompt:", error);
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
      name: '', // Name is empty by default
      aiHint: aiHint
    };
  } catch (error) {
    console.error("Error generating image with Genkit AI:", error);
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Generating`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: prompt,
      alt: `Error generating image for prompt: ${prompt}. Placeholder shown.`,
      name: '', // Name is empty by default
      aiHint: aiHint
    };
  }
}

export async function handleRefineExistingImage(originalImage: GeneratedImage, refinementPrompt: string): Promise<GeneratedImage> {
  const imageId = `${Date.now()}-refined-${refinementPrompt.substring(0, 10).replace(/\s/g, '_')}`;
  const promptWords = refinementPrompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');
  
  if (!originalImage.url.startsWith('data:')) {
    console.error("Error: Original image for refinement is not a data URI.");
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, 
      alt: `Error refining image. Original image was not a data URI. Placeholder shown. Original prompt: '${originalImage.prompt}'.`,
      name: originalImage.name || '', 
      aiHint: aiHint,
    };
  }
  
  try {
    const input: RefineImageInput = { originalImageDataUri: originalImage.url, refinementPrompt };
    const result: RefineImageOutput = await refineImageAiFlow(input);

    return {
      id: imageId, 
      url: result.imageDataUri,
      prompt: originalImage.prompt, 
      alt: `AI-refined image. Original prompt: '${originalImage.prompt}'. Refinement instructions: '${refinementPrompt}'.`,
      name: originalImage.name || '', 
      aiHint: aiHint 
    };
  } catch (error) {
    console.error("Error refining image with Genkit AI:", error);
    const fallbackImageUrl = `https://placehold.co/512x512.png?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, 
      alt: `Error refining image. Original prompt: '${originalImage.prompt}'. Attempted refinement: '${refinementPrompt}'. Placeholder shown.`,
      name: originalImage.name || '', 
      aiHint: aiHint
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

export async function handleUploadImageToS3(
  image: GeneratedImage,
  s3Config: S3Config
): Promise<{ success: boolean; message: string; url?: string }> {
  console.log(`Attempting to upload image "${image.name}" to S3 bucket "${s3Config.bucketName}" with prefix "${s3Config.prefix}".`);
  // console.log("Image URL (first 100 chars):", image.url.substring(0,100));
  // console.log("S3 Access Key ID:", s3Config.accessKeyId ? "Provided" : "Missing");
  // DO NOT log secretAccessKey

  if (!image.url.startsWith('data:image')) {
    return { success: false, message: 'Image is not a valid data URI and cannot be uploaded.' };
  }

  if (!s3Config.url || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) { 
     return { success: false, message: 'S3 configuration (URL, Access Key, Secret Key, Bucket Name) is incomplete. Please check settings.' };
  }
  
  if (!image.name || image.name.trim() === '') {
    return { success: false, message: 'Image name is required for S3 upload. Please provide a name.' };
  }

  // Parse S3 URL for MinIO client
  let s3ServiceUrl: URL;
  try {
    // Ensure the URL has a scheme for proper parsing
    let fullUrl = s3Config.url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      // Attempt to default to http if no scheme, or handle error if it's still invalid
      // For simplicity, let's assume user provides http/https. A more robust solution would validate/default.
      // For now, if it's schemeless, let new URL try to parse it, it might work if it's just hostname:port
      console.warn(`S3 URL "${s3Config.url}" does not have a scheme (http/https). Attempting to parse as is.`);
    }
    s3ServiceUrl = new URL(fullUrl.includes('://') ? fullUrl : `http://${fullUrl}`);

  } catch (e) {
    return { success: false, message: `Invalid S3 URL format: ${s3Config.url}. It must include http:// or https://. Error: ${(e as Error).message}` };
  }

  const endPoint = s3ServiceUrl.hostname;
  let portNum: number;
  if (s3ServiceUrl.port) {
    portNum = parseInt(s3ServiceUrl.port, 10);
    if (isNaN(portNum)) {
      return { success: false, message: `Invalid port in S3 URL: ${s3ServiceUrl.port}` };
    }
  } else {
    portNum = s3ServiceUrl.protocol === 'https:' ? 443 : 80; // Default ports
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

    // Prepare image data
    const dataUriMatches = image.url.match(/^data:(image\/.+?);base64,(.+)$/); // Capture full image mime type
    if (!dataUriMatches || dataUriMatches.length !== 3) {
      return { success: false, message: 'Invalid image data URI format for S3 upload.' };
    }
    const mimeType = dataUriMatches[1];
    const base64Data = dataUriMatches[2];
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Construct S3 object key
    const baseName = image.name.trim();
    const extension = getExtensionFromMimeType(mimeType);
    
    // Ensure baseName does not already have an extension that matches, to prevent "name.png.png"
    let fileNameWithExtension = baseName;
    if (!baseName.toLowerCase().endsWith(extension.toLowerCase())) {
        fileNameWithExtension = baseName + extension;
    }

    let s3ObjectKey = fileNameWithExtension;
    if (s3Config.prefix) {
      const normalizedPrefix = s3Config.prefix.endsWith('/') || s3Config.prefix === '' ? s3Config.prefix : `${s3Config.prefix}/`;
      // Avoid double slashes if prefix is just "/" or empty and object key starts with /
      s3ObjectKey = `${normalizedPrefix}${s3ObjectKey}`.replace(/^\/+/, ''); // Remove leading slashes
    }
     // Ensure no leading slash for the final object key passed to putObject
    if (s3ObjectKey.startsWith('/')) {
        s3ObjectKey = s3ObjectKey.substring(1);
    }


    await minioClient.putObject(s3Config.bucketName, s3ObjectKey, imageBuffer, {
      'Content-Type': mimeType,
    });

    // Construct the URL for the uploaded object
    const uploadedFileUrl = `${s3ServiceUrl.protocol}//${s3ServiceUrl.host}${s3ServiceUrl.port && ![80,443].includes(portNum) ? ':'+portNum : ''}/${s3Config.bucketName}/${s3ObjectKey}`;
    
    return { 
      success: true, 
      message: `Image "${fileNameWithExtension}" uploaded successfully to S3.`, // Simplified message
      url: uploadedFileUrl
    };

  } catch (error: any) {
    console.error("Error uploading to MinIO S3 compatible storage:", error);
    let errorMessage = 'Failed to upload image to S3.';
    if (error.code) { // Minio errors often have a 'code' property
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
