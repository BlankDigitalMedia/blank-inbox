import { z } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { AgentResult } from './types';

export interface AgentBase {
  name: string;
  execute(context: {
    email: string;
    emailContext: any;
    discoveredData: Record<string, any>;
    requestedFields: Array<{ name: string; description: string; type: string }>;
  }): Promise<AgentResult>;
}

export abstract class BaseAgent implements AgentBase {
  abstract name: string;
  protected openai: OpenAI;
  protected firecrawlApiKey: string;

  constructor(openaiApiKey: string, firecrawlApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.firecrawlApiKey = firecrawlApiKey;
  }

  abstract execute(context: {
    email: string;
    emailContext: any;
    discoveredData: Record<string, any>;
    requestedFields: Array<{ name: string; description: string; type: string }>;
  }): Promise<AgentResult>;

  protected async extractWithLLM(
    prompt: string,
    schema: z.ZodSchema,
    context: string
  ): Promise<z.infer<typeof schema>> {
    try {
      const completion = await this.openai.chat.completions.parse({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: context },
        ],
        response_format: zodResponseFormat(schema, 'enrichment_result'),
      });

      const message = completion.choices[0]?.message;
      if (!message?.parsed) {
        throw new Error('No parsed content in LLM response');
      }

      return message.parsed as z.infer<typeof schema>;
    } catch (error) {
      console.error(`[${this.name}] LLM extraction error:`, error);
      throw error;
    }
  }
}

