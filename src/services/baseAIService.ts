export interface AIModelConfig {
  apiKey: string;
  isFreeAccount: boolean;
  model: string;
}

export interface AIServiceOptions {
  verbose: boolean;
}

export abstract class BaseAIService {
  protected verbose: boolean;
  protected config: AIModelConfig = { apiKey: '', isFreeAccount: true, model: '' };

  constructor(options: AIServiceOptions) {
    this.verbose = options.verbose;
  }

  abstract initialize(config: AIModelConfig): Promise<void>;
  abstract generateContent(prompt: string): Promise<string>;
} 