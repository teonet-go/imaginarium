// src/app/actions.ts
'use server';

import { refinePrompt as refinePromptFlow, type RefinePromptInput, type RefinePromptOutput } from '@/ai/flows/refine-prompt';
import { generateImage as generateImageAiFlow, type GenerateImageInput, type GenerateImageOutput } from '@/ai/flows/generate-image-flow';
import { refineImage as refineImageAiFlow, type RefineImageInput, type RefineImageOutput } from '@/ai/flows/refine-image-flow';

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

