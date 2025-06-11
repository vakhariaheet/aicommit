import OpenAI from 'openai';
import { BaseAIService, AIModelConfig, AIServiceOptions } from './baseAIService';
import { Timer } from '../utils/timing';

export class OpenAIService extends BaseAIService {
  private client: OpenAI | null = null;
  private timer: Timer;

  constructor(options: AIServiceOptions) {
    super(options);
    this.timer = new Timer(options.verbose);
  }

  async initialize(config: AIModelConfig): Promise<void> {
    this.timer.start('Initializing OpenAI client');
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.timer.end('Initializing OpenAI client');
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    this.timer.start('Generating content with OpenAI');
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4o-min',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates git commit messages based on code changes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const message = completion.choices[0]?.message?.content;
      if (!message) {
        throw new Error('No response from OpenAI');
      }

      this.timer.end('Generating content with OpenAI');
      return message;
    } catch (error) {
      throw new Error(`OpenAI API error: ${(error as Error).message}`);
    }
  }
} 