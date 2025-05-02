'use server';

/**
 * @fileOverview Analyzes the attention-grabbing sections of a text document.
 *
 * - analyzeDocumentAttention - A function that analyzes a text document and highlights the most and least engaging sections.
 * - AnalyzeDocumentAttentionInput - The input type for the analyzeDocumentAttention function.
 * - AnalyzeDocumentAttentionOutput - The return type for the analyzeDocumentAttention function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AnalyzeDocumentAttentionInputSchema = z.object({
  documentText: z
    .string()
    .describe('The text content of the document to be analyzed.'),
});
export type AnalyzeDocumentAttentionInput = z.infer<
  typeof AnalyzeDocumentAttentionInputSchema
>;

const AnalyzeDocumentAttentionOutputSchema = z.object({
  heatmapHighlightedText: z
    .string()
    .describe(
      'The text content of the document with HTML span elements using specific CSS classes for heatmap highlighting, indicating engaging and boring sections.'
    ),
});
export type AnalyzeDocumentAttentionOutput = z.infer<
  typeof AnalyzeDocumentAttentionOutputSchema
>;

export async function analyzeDocumentAttention(
  input: AnalyzeDocumentAttentionInput
): Promise<AnalyzeDocumentAttentionOutput> {
  // Basic input validation example
  if (!input.documentText || input.documentText.trim().length === 0) {
      throw new Error("Document text cannot be empty.");
  }
  if (input.documentText.length > 50000) { // Example limit
      throw new Error("Document text is too long. Please provide shorter text.");
  }
  return analyzeDocumentAttentionFlow(input);
}

const analyzeDocumentAttentionPrompt = ai.definePrompt({
  name: 'analyzeDocumentAttentionPrompt',
  input: {
    schema: z.object({
      documentText: z
        .string()
        .describe('The text content of the document to be analyzed.'),
    }),
  },
  output: {
    schema: z.object({
      heatmapHighlightedText: z
        .string()
        .describe(
          'The text content of the document with HTML span elements using specific CSS classes for heatmap highlighting, indicating engaging and boring sections.'
        ),
    }),
  },
  // Updated prompt to use CSS classes instead of inline styles
  prompt: `You are an AI expert in content engagement analysis. Analyze the following document and highlight the most and least engaging sections using HTML span elements with specific CSS classes. Mark engaging sections by wrapping them in "<span class='heatmap-engaging'>...</span>" tags and boring sections by wrapping them in "<span class='heatmap-boring'>...</span>" tags. The 'heatmap-engaging' class corresponds to highly interesting content (like teal background, white text), and the 'heatmap-boring' class corresponds to less interesting content (like light grey background, dark grey text). Return the entire document text with these HTML span elements inserted appropriately around the identified sections. Ensure the returned text is valid HTML suitable for direct rendering.

Document:
{{{documentText}}}`,
});

const analyzeDocumentAttentionFlow = ai.defineFlow<
  typeof AnalyzeDocumentAttentionInputSchema,
  typeof AnalyzeDocumentAttentionOutputSchema
>(
  {
    name: 'analyzeDocumentAttentionFlow',
    inputSchema: AnalyzeDocumentAttentionInputSchema,
    outputSchema: AnalyzeDocumentAttentionOutputSchema,
  },
  async input => {
    // Optional: Add pre-processing if needed (e.g., clean up text)
    const cleanedInput = { ...input }; // Example: apply cleaning if needed

    const {output} = await analyzeDocumentAttentionPrompt(cleanedInput);

    // Optional: Add post-processing or validation on the output
    if (!output?.heatmapHighlightedText) {
        throw new Error("AI analysis did not return highlighted text.");
    }
    // Example validation: Check if expected classes are present (very basic)
    if (!output.heatmapHighlightedText.includes('heatmap-engaging') && !output.heatmapHighlightedText.includes('heatmap-boring')) {
      console.warn("AI analysis completed, but no engagement/boring sections were highlighted. Returning original text or default message.");
      // Decide how to handle: return original, return modified message, or return as-is
       // For now, return as-is, but log a warning.
    }


    return output;
  }
);
