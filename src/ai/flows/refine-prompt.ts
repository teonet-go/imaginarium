// src/ai/flows/refine-prompt.ts
'use server';
/**
 * @fileOverview Refines an image generation prompt and suggests related prompts.
 *
 * - refinePrompt - A function that refines a given prompt and suggests related prompts.
 * - RefinePromptInput - The input type for the refinePrompt function.
 * - RefinePromptOutput - The return type for the refinePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefinePromptInputSchema = z.object({
  originalPrompt: z.string().describe('The original prompt provided by the user.'),
});
export type RefinePromptInput = z.infer<typeof RefinePromptInputSchema>;

const RefinePromptOutputSchema = z.object({
  refinedPrompt: z.string().describe('The refined prompt for generating a better image.'),
  suggestedPrompts: z.array(z.string()).describe('Related prompts that might improve image generation.'),
});
export type RefinePromptOutput = z.infer<typeof RefinePromptOutputSchema>;

export async function refinePrompt(input: RefinePromptInput): Promise<RefinePromptOutput> {
  return refinePromptFlow(input);
}

const refinePromptPrompt = ai.definePrompt({
  name: 'refinePromptPrompt',
  input: {schema: RefinePromptInputSchema},
  output: {schema: RefinePromptOutputSchema},
  prompt: `You are an expert prompt engineer specializing in refining prompts for image generation.

  Given the original prompt from the user, your task is to:
  1. Refine the prompt to be more specific, descriptive, and effective for generating high-quality images.
  2. Suggest a list of related prompts that explore different aspects or variations of the original idea.

  Original Prompt: {{{originalPrompt}}}
  Refined Prompt: 
  Suggested Prompts:`, // Ensure the prompt is valid Handlebars.
});

const refinePromptFlow = ai.defineFlow(
  {
    name: 'refinePromptFlow',
    inputSchema: RefinePromptInputSchema,
    outputSchema: RefinePromptOutputSchema,
  },
  async input => {
    const {output} = await refinePromptPrompt(input);
    return output!;
  }
);
