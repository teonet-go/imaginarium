// src/ai/flows/refine-image-flow.ts
'use server';
/**
 * @fileOverview Refines an existing image based on a new text prompt using an AI model.
 *
 * - refineImage - A function that handles the image refinement process.
 * - RefineImageInput - The input type for the refineImage function.
 * - RefineImageOutput - The return type for the refineImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineImageInputSchema = z.object({
  originalImageDataUri: z
    .string()
    .describe(
      "The original image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  refinementPrompt: z.string().describe('The text prompt to guide the image refinement.'),
});
export type RefineImageInput = z.infer<typeof RefineImageInputSchema>;

const RefineImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The refined image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RefineImageOutput = z.infer<typeof RefineImageOutputSchema>;

export async function refineImage(input: RefineImageInput): Promise<RefineImageOutput> {
  return refineImageFlow(input);
}

const refineImageFlow = ai.defineFlow(
  {
    name: 'refineImageFlow',
    inputSchema: RefineImageInputSchema,
    outputSchema: RefineImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Must use this model for image generation/refinement
      prompt: [
        { media: { url: input.originalImageDataUri } },
        { text: input.refinementPrompt },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must provide both TEXT and IMAGE
      },
    });

    if (!media || !media.url) {
      throw new Error('Image refinement failed or returned no media URL.');
    }
    
    // Ensure the URL is a data URI as expected by the schema
    if (!media.url.startsWith('data:')) {
        console.warn(`Generated media URL is not a data URI: ${media.url}. This might cause issues.`);
    }

    return { imageDataUri: media.url };
  }
);
