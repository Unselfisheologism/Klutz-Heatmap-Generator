'use server';

/**
 * @fileOverview Analyzes an image to generate a heatmap of visual attention.
 *
 * - analyzeImageAttention - Analyzes the image and returns a heatmap.
 * - AnalyzeImageAttentionInput - The input type for the analyzeImageAttention function.
 * - AnalyzeImageAttentionOutput - The return type for the analyzeImageAttention function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeImageAttentionInputSchema = z.object({
  photoDataUri: z
    .string()
     .refine((uri) => uri.startsWith('data:image/'), { // Basic validation for image data URI
       message: "Input must be a valid image data URI (e.g., 'data:image/png;base64,...')."
     })
    .describe(
      "A photo, as a data URI that must include a MIME type (e.g., image/png, image/jpeg) and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageAttentionInput = z.infer<typeof AnalyzeImageAttentionInputSchema>;

const AnalyzeImageAttentionOutputSchema = z.object({
  heatmapDataUri: z
    .string()
     .refine((uri) => uri.startsWith('data:image/'), { // Basic validation for image data URI
       message: "Output must be a valid image data URI."
     })
    .describe(
      'A heatmap image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
    ),
});
export type AnalyzeImageAttentionOutput = z.infer<typeof AnalyzeImageAttentionOutputSchema>;

export async function analyzeImageAttention(input: AnalyzeImageAttentionInput): Promise<AnalyzeImageAttentionOutput> {
   // Validate input using Zod schema before calling the flow
   const validationResult = AnalyzeImageAttentionInputSchema.safeParse(input);
   if (!validationResult.success) {
     // Throw a more specific error based on Zod's issues
     throw new Error(`Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
   }
  return analyzeImageAttentionFlow(validationResult.data);
}

const createImageAttentionHeatmapTool = ai.defineTool({
  name: 'createImageAttentionHeatmap',
  description: 'Generates a heatmap visualizing areas of high and low attention in an image.',
  inputSchema: z.object({
    photoDataUri: z
      .string()
      .describe(
        "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
  }),
  outputSchema: z.string().describe('The data URI of the generated heatmap image.'),
}, async (input) => {
  // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
  try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Ensure this model is correct and available
        prompt: [
          {media: {url: input.photoDataUri}},
          {text: 'Generate a heatmap overlay visualizing areas of high visual attention on this image. Use warmer colors (red, orange, yellow) for high attention and cooler colors (blue, green) for low attention, fading to transparent where attention is minimal.'},
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
          // Add temperature or other params if needed
          // temperature: 0.5,
        },
         // Add timeout if necessary
         // timeout: 60000, // 60 seconds
      });

      if (!media?.url || !media.url.startsWith('data:image/')) {
          throw new Error('AI did not return a valid heatmap image data URI.');
      }

      return media.url;
  } catch (error: any) {
       console.error("Error in createImageAttentionHeatmapTool:", error);
       // Provide a more specific error message if possible
       const message = error.message || 'Failed to generate heatmap using AI tool.';
       throw new Error(`Heatmap Generation Failed: ${message}`);
  }

});

const analyzeImageAttentionPrompt = ai.definePrompt({
  name: 'analyzeImageAttentionPrompt',
  tools: [createImageAttentionHeatmapTool],
  input: {
    schema: z.object({
      photoDataUri: z
        .string()
        .describe(
          "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
    }),
  },
  output: {
    schema: z.object({
      heatmapDataUri: z
        .string()
        .describe(
          'A heatmap image, as a data URI that must include a MIME type and use Base64 encoding. Expected format: data:<mimetype>;base64,<encoded_data>.'
        ),
    }),
  },
  prompt: `Analyze the provided image to understand its key focal points and areas likely to attract visual attention. Use the createImageAttentionHeatmap tool to generate a heatmap visualizing these attention areas. Return only the data URI of the generated heatmap image.

   Image: {{media url=photoDataUri}}`,
});

const analyzeImageAttentionFlow = ai.defineFlow<
  typeof AnalyzeImageAttentionInputSchema,
  typeof AnalyzeImageAttentionOutputSchema
>({
  name: 'analyzeImageAttentionFlow',
  inputSchema: AnalyzeImageAttentionInputSchema,
  outputSchema: AnalyzeImageAttentionOutputSchema,
}, async (input) => {
  try {
      const {output} = await analyzeImageAttentionPrompt(input);

      if (!output?.heatmapDataUri) {
          throw new Error('AI analysis prompt did not return the expected heatmap data URI.');
      }

       // Validate the output format again before returning
       const validationResult = AnalyzeImageAttentionOutputSchema.safeParse(output);
        if (!validationResult.success) {
            throw new Error(`Invalid output from AI: ${validationResult.error.errors.map(e => e.message).join(', ')}`);
        }

      return validationResult.data;
  } catch (error: any) {
      console.error("Error in analyzeImageAttentionFlow:", error);
      const message = error.message || 'Failed to analyze image attention.';
       throw new Error(`Image Analysis Failed: ${message}`);
  }

});
