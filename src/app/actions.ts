'use server';

import { refinePrompt as refinePromptFlow, type RefinePromptInput, type RefinePromptOutput } from '@/ai/flows/refine-prompt';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  alt: string;
  aiHint?: string;
}

export async function handleRefinePrompt(originalPrompt: string): Promise<RefinePromptOutput> {
  if (!originalPrompt.trim()) {
    // Return empty/default if prompt is empty to avoid unnecessary API call
    return { refinedPrompt: '', suggestedPrompts: [] };
  }
  const input: RefinePromptInput = { originalPrompt };
  try {
    // Add a slight delay to simulate network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await refinePromptFlow(input);
    return result;
  } catch (error) {
    console.error("Error refining prompt:", error);
    // Fallback or rethrow depending on desired error handling
    // For now, return a structured error or a default refined prompt
    return {
      refinedPrompt: `Could not refine: ${originalPrompt}`,
      suggestedPrompts: [],
    };
  }
}

export async function handleGenerateImage(prompt: string): Promise<GeneratedImage> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Use picsum.photos for placeholder images
  // Generate a somewhat unique ID for the image based on prompt and time
  const imageId = `${Date.now()}-${prompt.substring(0, 10).replace(/\s/g, '_')}`;
  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageId)}/512/512`;
  
  // Create an AI hint from the prompt
  const promptWords = prompt.split(' ').slice(0, 2);
  const aiHint = promptWords.join(' ');

  return {
    id: imageId,
    url: imageUrl,
    prompt: prompt,
    alt: `Generated image for prompt: ${prompt}`,
    aiHint: aiHint
  };
}
