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
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Generating`;
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
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, 
      alt: `Error refining image. Original image was not a data URI. Placeholder shown. Original prompt: '${originalImage.prompt}'.`,
      name: originalImage.name || '', // Keep original name or empty if it was empty
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
      name: originalImage.name || '', // Keep original name or empty if it was empty
      aiHint: aiHint 
    };
  } catch (error) {
    console.error("Error refining image with Genkit AI:", error);
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: originalImage.prompt, 
      alt: `Error refining image. Original prompt: '${originalImage.prompt}'. Attempted refinement: '${refinementPrompt}'. Placeholder shown.`,
      name: originalImage.name || '', // Keep original name or empty if it was empty
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

  if (!s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) { 
     return { success: false, message: 'S3 configuration (Access Key, Secret Key, Bucket Name) is incomplete. Please check settings.' };
  }
  
  if (!image.name || image.name.trim() === '') {
    return { success: false, message: 'Image name is required for S3 upload. Please provide a name.' };
  }


  // Placeholder for actual S3 upload logic
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  
  let s3ObjectKey = image.name.trim(); // Use trimmed name
  if (s3Config.prefix) {
     const normalizedPrefix = s3Config.prefix.endsWith('/') || s3Config.prefix === '' ? s3Config.prefix : `${s3Config.prefix}/`;
     s3ObjectKey = `${normalizedPrefix}${s3ObjectKey}`;
  }
  const typeMatch = image.url.match(/^data:image\/(\w+);base64,/);
  const extension = typeMatch ? typeMatch[1] : 'png';


  const mockS3Url = `s3://${s3Config.bucketName}/${s3ObjectKey}.${extension}`; 

  return { success: true, message: `Image "${image.name.trim()}" would be uploaded to S3. (Mock Path: ${mockS3Url})`, url: mockS3Url };
}
