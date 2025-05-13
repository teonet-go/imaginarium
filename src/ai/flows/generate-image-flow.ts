// src/ai/flows/generate-image-flow.ts
'use server';
/**
 * @fileOverview Generates an image based on a text prompt using an AI model.
 *
 * - generateImage - A function that handles the image generation process.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Must use this model for image generation
      prompt: input.prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must provide both TEXT and IMAGE
        // Optional: Add safety settings if needed.
        // Example:
        // safetySettings: [
        //   {
        //     category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        //     threshold: 'BLOCK_LOW_AND_ABOVE',
        //   },
        //   {
        //     category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        //     threshold: 'BLOCK_NONE',
        //   }
        // ],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed or returned no media URL.');
    }

    // Ensure the URL is a data URI as expected by the schema
    if (!media.url.startsWith('data:')) {
        console.warn(`Generated media URL is not a data URI: ${media.url}. This might cause issues.`);
    }
    
    return { imageDataUri: media.url };
  }
);
