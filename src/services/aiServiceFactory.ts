import { BaseAIService, AIModelConfig, AIServiceOptions } from './baseAIService';
import { GeminiService } from './geminiService';
import { OpenAIService } from './openAIService';

export type AIProvider = 'gemini' | 'openai';

export class AIServiceFactory {
  static createService(provider: AIProvider, options: AIServiceOptions): BaseAIService {
    switch (provider) {
      case 'gemini':
        return new GeminiService(options);
      case 'openai':
        return new OpenAIService(options);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
} 