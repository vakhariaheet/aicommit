import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseAIService, AIModelConfig, AIServiceOptions } from './baseAIService';
import { Timer } from '../utils/timing';

export class GeminiService extends BaseAIService {
  private model: any = null;
  private timer: Timer;

  constructor(options: AIServiceOptions) {
    super(options);
    this.timer = new Timer(options.verbose);
  }

  async initialize(config: AIModelConfig): Promise<void> {
    this.timer.start('Initializing Gemini model');
    this.config = config;
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({ model: config.model || 'gemini-2.0-flash' });
    this.timer.end('Initializing Gemini model');
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.model) {
      throw new Error('Gemini model not initialized');
    }

    this.timer.start('Generating content with Gemini');
    try {
      const result = await this.model.generateContent(prompt);
      const message = result.response.text();
      this.timer.end('Generating content with Gemini');
      return message;
    } catch (error) {
      throw new Error(`Gemini API error: ${(error as Error).message}`);
    }
  }
} 