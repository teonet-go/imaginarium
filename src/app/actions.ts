// src/app/actions.ts
'use server';

import { refinePrompt as refinePromptFlow, type RefinePromptInput, type RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { generateImage as generateImageAiFlow, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { refineImage as refineImageAiFlow, type RefineImageInput, type RefineImageOutput } from '@/ai/flows/refine-image-flow';
import type { S3Config } from '@/lib/s3-config'; // S3Config now has prefix instead of region

export interface GeneratedImage {
  id: string;
  url: string; // Can be a regular URL or a data URI
  prompt: string;
  alt: string;
  name: string; // For filename
  aiHint?: string;
}

function sanitizeFilename(name: string, defaultName: string = 'untitled_image'): string {
  const sanitized = name.substring(0, 50).replace(/[^\w.-]/gi, '_').replace(/\s+/g, '_').toLowerCase();
  return sanitized || defaultName;
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
  const imageName = sanitizeFilename(prompt, `image_${imageId}`);

  try {
    const input: GenerateImageInput = { prompt };
    const result: GenerateImageOutput = await generateImageAiFlow(input);

    return {
      id: imageId,
      url: result.imageDataUri,
      prompt: prompt,
      alt: `AI generated image for prompt: ${prompt}`,
      name: imageName,
      aiHint: aiHint
    };
  } catch (error) {
    console.error("Error generating image with Genkit AI:", error);
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Generating`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: prompt,
      alt: `Error generating image for prompt: ${prompt}. Placeholder shown.`,
      name: imageName,
      aiHint: aiHint
    };
  }
}

export async function handleRefineExistingImage(originalImage: GeneratedImage, refinementPrompt: string): Promise<GeneratedImage> {
  const imageId = `${Date.now()}-refined-${refinementPrompt.substring(0, 10).replace(/\s/g, '_')}`;
  const promptWords = refinementPrompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');
  const newName = sanitizeFilename(refinementPrompt, `refined_${originalImage.name || imageId}`);


  if (!originalImage.url.startsWith('data:')) {
    console.error("Error: Original image for refinement is not a data URI.");
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, // Keep original prompt for display
      alt: `Error refining image. Original image was not a data URI. Placeholder shown. Original prompt: '${originalImage.prompt}'.`,
      name: newName,
      aiHint: aiHint,
    };
  }
  
  try {
    const input: RefineImageInput = { originalImageDataUri: originalImage.url, refinementPrompt };
    const result: RefineImageOutput = await refineImageAiFlow(input);

    return {
      id: imageId, 
      url: result.imageDataUri,
      prompt: originalImage.prompt, // Keep the original image's prompt for display on the card
      alt: `AI-refined image. Original prompt: '${originalImage.prompt}'. Refinement instructions: '${refinementPrompt}'.`,
      name: newName, // Name can be based on refinementPrompt
      aiHint: aiHint // AI hint can be based on refinementPrompt
    };
  } catch (error) {
    console.error("Error refining image with Genkit AI:", error);
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, // Keep original prompt for display
      alt: `Error refining image. Original prompt: '${originalImage.prompt}'. Attempted refinement: '${refinementPrompt}'. Placeholder shown.`,
      name: newName,
      aiHint: aiHint
    };
  }
}

export async function handleUploadImageToS3(
  image: GeneratedImage,
  s3Config: S3Config
): Promise<{ success: boolean; message: string; url?: string }> {
  console.log(`Attempting to upload image "${image.name}" to S3 bucket "${s3Config.bucketName}" with prefix "${s3Config.prefix}".`);
  console.log("Image URL (first 100 chars):", image.url.substring(0,100));
  console.log("S3 Access Key ID:", s3Config.accessKeyId ? "Provided" : "Missing");
  // DO NOT log secretAccessKey

  if (!image.url.startsWith('data:image')) {
    return { success: false, message: 'Image is not a valid data URI and cannot be uploaded.' };
  }

  if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) { // prefix is optional for path, but these are mandatory
     return { success: false, message: 'S3 configuration (Access Key, Secret Key, Bucket Name) is incomplete. Please check settings.' };
  }

  // Placeholder for actual S3 upload logic
  // In a real app, you would use an S3 SDK (e.g., aws-sdk or a MinIO specific one if preferred).
  // Example structure for aws-sdk with MinIO (often compatible):
  // const AWS = require('aws-sdk');
  // const s3 = new AWS.S3({
  //   accessKeyId: s3Config.accessKeyId,
  //   secretAccessKey: s3Config.secretAccessKey,
  //   endpoint: 'YOUR_MINIO_ENDPOINT_URL', // e.g., 'http://localhost:9000'
  //   s3ForcePathStyle: true, // Important for MinIO
  //   signatureVersion: 'v4',
  // });
  // const base64Data = Buffer.from(image.url.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  // const typeMatch = image.url.match(/^data:image\/(\w+);base64,/);
  // const type = typeMatch ? typeMatch[1] : 'png';
  //
  // let s3Key = image.name;
  // if (s3Config.prefix) {
  //    const normalizedPrefix = s3Config.prefix.endsWith('/') ? s3Config.prefix : `${s3Config.prefix}/`;
  //    s3Key = `${normalizedPrefix}${image.name}`;
  // }
  // s3Key = `${s3Key}.${type}`; // Add extension to the S3 key
  //
  // const params = {
  //   Bucket: s3Config.bucketName,
  //   Key: s3Key,
  //   Body: base64Data,
  //   ContentEncoding: 'base64',
  //   ContentType: `image/${type}`,
  //   // ACL: 'public-read', // Optional: if you want the image to be publicly accessible - check MinIO policies
  // };
  // try {
  //   const { Location } = await s3.upload(params).promise(); // Location might not be standard for all S3-likes
  //   // For MinIO, you might construct the URL yourself if Location is not returned/reliable
  //   const uploadedUrl = Location || `YOUR_MINIO_ENDPOINT_URL/${s3Config.bucketName}/${s3Key}`;
  //   return { success: true, message: 'Image uploaded to S3 successfully!', url: uploadedUrl };
  // } catch (error) {
  //   console.error('S3 Upload Error:', error);
  //   return { success: false, message: `S3 Upload Failed: ${error.message}` };
  // }

  await new Promise(resolve => setTimeout(resolve, 1500)); 
  
  let s3ObjectKey = image.name;
  if (s3Config.prefix) {
     const normalizedPrefix = s3Config.prefix.endsWith('/') || s3Config.prefix === '' ? s3Config.prefix : `${s3Config.prefix}/`;
     s3ObjectKey = `${normalizedPrefix}${image.name}`;
  }
  const typeMatch = image.url.match(/^data:image\/(\w+);base64,/);
  const extension = typeMatch ? typeMatch[1] : 'png';


  const mockS3Url = `s3://${s3Config.bucketName}/${s3ObjectKey}.${extension}`; // Generic S3 path

  return { success: true, message: `Image "${image.name}" would be uploaded to S3. (Mock Path: ${mockS3Url})`, url: mockS3Url };
}
