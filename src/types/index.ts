import { AIProvider } from '../services/aiServiceFactory';

export interface Config {
  AI_PROVIDER: AIProvider;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
  IS_FREE_ACCOUNT: boolean;
  LAST_REQUEST_TIME?: number;
  MODEL?: string;
  defaults?: {
    push?: boolean;
    multiline?: boolean;
    verbose?: boolean;
    emoji?: boolean;
    scope?: string;
    breaking?: boolean;
    customPrompt?: string;
    useType?: boolean;
  };
}

export const CONFIG_KEYS = ['AI_PROVIDER', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'IS_FREE_ACCOUNT', 'LAST_REQUEST_TIME', 'MODEL', 'defaults'] as const;
export type ConfigKey = typeof CONFIG_KEYS[number];

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert'
] as const;

export type CommitType = typeof COMMIT_TYPES[number];

export interface CommitOptions {
  push?: boolean;
  multiline?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  amend?: boolean;
  files?: string;
  useType?: boolean;
  emoji?: boolean;
  scope?: string;
  breaking?: boolean;
  ref?: string;
  revert?: boolean;
  customPrompt?: string;
  model?: string;
}

export interface ConfigOptions {
  free?: boolean;
  paid?: boolean;
}

export interface GenerateMessageOptions {
  diff: string;
  multiline: boolean;
  useType?: boolean;
  emoji?: boolean;
  scope?: string;
  breaking?: boolean;
  ref?: string;
  customPrompt?: string;
  model?: string;
}

export const OPENAI_MODELS = [
  'gpt-4',
  'gpt-4-turbo-preview',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k'
] as const;

export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-vision'
] as const;

export type OpenAIModel = typeof OPENAI_MODELS[number];
export type GeminiModel = typeof GEMINI_MODELS[number]; 