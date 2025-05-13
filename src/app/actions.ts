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
      aiHint: aiHint
    };
  } catch (error) {
    console.error("Error generating image with Genkit AI:", error);
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Generating+Image`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: prompt,
      alt: `Error generating image for prompt: ${prompt}. Placeholder shown.`,
      aiHint: aiHint
    };
  }
}

export async function handleRefineExistingImage(originalImageDataUri: string, refinementPrompt: string): Promise<GeneratedImage> {
  const imageId = `${Date.now()}-refined-${refinementPrompt.substring(0, 10).replace(/\s/g, '_')}`;
  const promptWords = refinementPrompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');

  if (!originalImageDataUri.startsWith('data:')) {
    console.error("Error: Original image for refinement is not a data URI.");
    // Fallback or specific error handling for non-data URI
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining+Image`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: refinementPrompt,
      alt: `Error refining image. Original image was not a data URI. Placeholder shown.`,
      aiHint: aiHint,
    };
  }
  
  try {
    const input: RefineImageInput = { originalImageDataUri, refinementPrompt };
    const result: RefineImageOutput = await refineImageAiFlow(input);

    return {
      id: imageId,
      url: result.imageDataUri,
      prompt: refinementPrompt,
      alt: `AI refined image based on prompt: ${refinementPrompt}`,
      aiHint: aiHint
    };
  } catch (error) {
    console.error("Error refining image with Genkit AI:", error);
    const fallbackImageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512?text=Error+Refining+Image`;
    return {
      id: imageId,
      url: fallbackImageUrl,
      prompt: refinementPrompt,
      alt: `Error refining image for prompt: ${refinementPrompt}. Placeholder shown.`,
      aiHint: aiHint
    };
  }
}
