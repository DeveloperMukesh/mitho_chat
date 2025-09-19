'use server';

/**
 * @fileOverview Generates smart reply suggestions based on the context of the current conversation.
 *
 * - generateSmartReplies - A function that generates smart reply suggestions.
 * - GenerateSmartRepliesInput - The input type for the generateSmartReplies function.
 * - GenerateSmartRepliesOutput - The return type for the generateSmartReplies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSmartRepliesInputSchema = z.object({
  messageHistory: z
    .array(z.string())
    .describe('The recent message history in the conversation.'),
});
export type GenerateSmartRepliesInput = z.infer<typeof GenerateSmartRepliesInputSchema>;

const GenerateSmartRepliesOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of smart reply suggestions.'),
});
export type GenerateSmartRepliesOutput = z.infer<typeof GenerateSmartRepliesOutputSchema>;

export async function generateSmartReplies(input: GenerateSmartRepliesInput): Promise<GenerateSmartRepliesOutput> {
  return generateSmartRepliesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartReplySuggestionsPrompt',
  input: {schema: GenerateSmartRepliesInputSchema},
  output: {schema: GenerateSmartRepliesOutputSchema},
  prompt: `You are a helpful assistant that provides smart reply suggestions for a conversation.

  Given the following message history, generate 3-5 smart reply suggestions that the user can use to respond quickly and easily.

  Message History:
  {{#each messageHistory}}
  - {{{this}}}
  {{/each}}

  Suggestions:`,
});

const generateSmartRepliesFlow = ai.defineFlow(
  {
    name: 'generateSmartRepliesFlow',
    inputSchema: GenerateSmartRepliesInputSchema,
    outputSchema: GenerateSmartRepliesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
