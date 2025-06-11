import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import { Config, CommitType, GenerateMessageOptions } from '../types';
import { MAX_DIFF_LENGTH, CHUNK_THRESHOLD, FREE_ACCOUNT_COOLDOWN } from '../config/constants';
import { getConfig } from '../config/configService';
import { formatError } from '../utils/error';
import { ConfigCommand } from '../commands/configCommand';
import { Timer } from '../utils/timing';
import { AIServiceFactory } from './aiServiceFactory';
import { BaseAIService } from './baseAIService';

export async function rateLimiter(config: Config) {
  if (config.IS_FREE_ACCOUNT) {
    const now = Date.now();
    const lastRequest = config.LAST_REQUEST_TIME || 0;
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < FREE_ACCOUNT_COOLDOWN) {
      const waitTime = FREE_ACCOUNT_COOLDOWN - timeSinceLastRequest;
      console.log(chalk.yellow(`Rate limit: Waiting ${Math.ceil(waitTime / 1000)} seconds...`));
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Update last request time
    config.LAST_REQUEST_TIME = now;
  }
}

export async function batchProcess<T>(
  items: T[],
  processor: (item: T) => Promise<string>,
  config: Config
): Promise<string[]> {
  const results: string[] = [];
  const MAX_CONCURRENT_REQUESTS = config.IS_FREE_ACCOUNT ? 2 : 5;
  
  for (let i = 0; i < items.length; i += MAX_CONCURRENT_REQUESTS) {
    const batch = items.slice(i, i + MAX_CONCURRENT_REQUESTS);
    
    await rateLimiter(config);
    
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await processor(item);
        } catch (error) {
          console.error(chalk.red('Error processing item:', error));
          return '';
        }
      })
    );
    
    results.push(...batchResults);
    
    if (i + MAX_CONCURRENT_REQUESTS < items.length) {
      console.log(chalk.blue(`Processed ${i + batch.length}/${items.length} chunks...`));
    }
  }
  
  return results.filter(Boolean);
}

interface GenerateCommitMessageOptions {
  diff: string;
  multiline: boolean;
  type?: CommitType;
  emoji?: boolean;
}

export async function generateCommitMessage(options: GenerateCommitMessageOptions): Promise<string> {
  const { diff, multiline, type, emoji = true } = options;
  const config = getConfig();
  if (!config) {
    throw new Error('Configuration not found');
  }

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  if (diff.length > CHUNK_THRESHOLD) {
    const chunks = splitDiffIntoChunks(diff);
    console.log(chalk.yellow(`📦 Processing ${chunks.length} chunks of changes...`));

    const chunkProcessor = async (chunk: string) => {
      const processedChunk = processDiff(chunk);
      const chunkPrompt = `Given this PART of the git diff, analyze the changes and provide a brief summary of the main changes in this chunk. Focus on WHAT changed and WHY. Be very concise.

${processedChunk}`;

      const result = await model.generateContent(chunkPrompt);
      return result.response.text().trim();
    };

    const chunkResults = await batchProcess(chunks, chunkProcessor, config);

    await rateLimiter(config);

    const summaryPrompt = `Based on these summaries of different parts of the changes, generate a ${multiline ? 'detailed multi-line' : 'single-line'} commit message:

${chunkResults.map((result, i) => `Part ${i + 1}: ${result}`).join('\n')}

${getCommitFormatInstructions(multiline, type, emoji)}

Output only the commit message, with no extra text or formatting.`;

    const finalResult = await model.generateContent(summaryPrompt);
    let message = finalResult.response.text().trim();
    
    if (type) {
      message = enforceCommitType(message, type, emoji);
    }
    
    return message;
  }

  await rateLimiter(config);
  const processedDiff = processDiff(diff);

  const prompt = multiline
    ? `Given the following git diff (which may be truncated for large changes), write a detailed commit message in the Conventional Commits format with the following structure:
${getCommitFormatInstructions(true, type, emoji)}

Focus on explaining WHAT changed and WHY, not HOW. Output only the commit message, with no extra text or formatting.
Add a footer with breaking changes or issues (if any)
${processedDiff}`
    : `Given the following git diff (which may be truncated for large changes), write a single-line commit message in the Conventional Commits format.
${getCommitFormatInstructions(false, type, emoji)}

${processedDiff}`;

  const result = await model.generateContent(prompt);
  let message = result.response.text().trim();
  
  if (type) {
    message = enforceCommitType(message, type, emoji);
  }
  
  return message;
}

function getCommitFormatInstructions(multiline: boolean, type?: CommitType, emoji: boolean = true): string {
  const typeInstruction = type 
    ? `Use exactly this type: "${type}"`
    : 'Use an appropriate type (feat, fix, chore, refactor, docs, etc.)';

  const emojiInstruction = emoji
    ? 'Add one relevant emoji after the type prefix to reflect the nature of the change.'
    : 'Do not include any emojis in the message.';

  if (multiline) {
    return `Format the message as:
1. First line: ${typeInstruction} followed by optional scope. ${emojiInstruction} Then add a brief description
2. Blank line
3. Detailed explanation of what and why (not how)
4. Blank line
5. Footer with breaking changes or issues (if any)`;
  }

  return `Format as: ${typeInstruction}(optional-scope). ${emojiInstruction} Then add a brief description`;
}

function enforceCommitType(message: string, type: CommitType, emoji: boolean): string {
  // Extract any existing scope
  const scopeMatch = message.match(/^[a-z]+(?:\([^)]+\))?:/);
  const scope = scopeMatch ? scopeMatch[0].match(/\([^)]+\)/) : null;
  
  // Extract emoji if present and needed
  let emojiToKeep = '';
  if (emoji) {
    const emojiMatch = message.match(/:\s*([\u{1F300}-\u{1F9FF}])/u);
    if (emojiMatch) {
      emojiToKeep = emojiMatch[1];
    }
  }
  
  // Get the description part (everything after the type/scope/emoji)
  const descriptionMatch = message.match(/^[^:]+:\s*(?:[\u{1F300}-\u{1F9FF}]\s*)?(.+)/u);
  const description = descriptionMatch ? descriptionMatch[1] : message;
  
  // Reconstruct the message with the enforced type
  let newMessage = `${type}${scope ? scope[0] : ''}: `;
  if (emoji && emojiToKeep) {
    newMessage += `${emojiToKeep} `;
  }
  newMessage += description;
  
  return newMessage;
}

function splitDiffIntoChunks(diff: string): string[] {
  const fileSections = diff.split('diff --git').filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const section of fileSections) {
    const fullSection = 'diff --git' + section;
    
    if (currentChunk.length + fullSection.length > MAX_DIFF_LENGTH) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = fullSection;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + fullSection;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function processDiff(diff: string, maxLength: number = MAX_DIFF_LENGTH): string {
  if (diff.length <= maxLength) {
    return diff;
  }

  const fileSections = diff.split('diff --git');
  let processedDiff = '';
  let currentLength = 0;

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const lines = section.split('\n');
    const fileHeader = lines[0];
    const changes = lines.slice(1);

    const fileMatch = fileHeader.match(/a\/(.+) b\//);
    const fileName = fileMatch ? fileMatch[1] : 'unknown file';

    const additions = changes.filter(line => line.startsWith('+')).length;
    const deletions = changes.filter(line => line.startsWith('-')).length;

    if (currentLength + section.length > maxLength) {
      const summary = `\ndiff --git ${fileHeader}\n` +
        `--- Summary of changes in ${fileName} ---\n` +
        `+++ ${additions} additions, ${deletions} deletions\n`;
      
      const representativeChanges = changes
        .filter(line => line.startsWith('+') || line.startsWith('-'))
        .slice(0, 5)
        .join('\n');

      processedDiff += summary + representativeChanges + '\n...(truncated)\n';
      currentLength += summary.length + representativeChanges.length + 15;
    } else {
      processedDiff += '\ndiff --git' + section;
      currentLength += section.length + 10;
    }

    if (currentLength >= maxLength) {
      processedDiff += '\n...(remaining diffs summarized)';
      break;
    }
  }

  return processedDiff;
}

export class AIService {
  private service: BaseAIService | null = null;
  private configCommand: ConfigCommand;
  private timer: Timer;

  constructor(verbose: boolean = false) {
    this.configCommand = new ConfigCommand();
    this.timer = new Timer(verbose);
  }

  private async initializeService(): Promise<void> {
    this.timer.start('Initializing AI service');
    const config = await this.configCommand.ensureConfig();
    
    // Create the appropriate service
    this.service = AIServiceFactory.createService(config.AI_PROVIDER, { verbose: this.timer.isVerbose });

    // Initialize with the correct API key
    const envKey = config.AI_PROVIDER === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
    const configKey = config.AI_PROVIDER === 'gemini' ? config.GEMINI_API_KEY : config.OPENAI_API_KEY;
    const apiKey = configKey || envKey;

    if (!apiKey) {
      throw new Error(`No API key found for ${config.AI_PROVIDER}. Please set it in the config or as an environment variable.`);
    }

    const model = config.MODEL || (config.AI_PROVIDER === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4.1-nano');
    await this.service.initialize({
      apiKey,
      isFreeAccount: config.IS_FREE_ACCOUNT,
      model
    });
    
    this.timer.end('Initializing AI service');
  }

  async generateCommitMessage(options: GenerateMessageOptions): Promise<string> {
    try {
      this.timer.start('Generating commit message');
      
      // Initialize service if not already initialized
      if (!this.service) {
        await this.initializeService();
      }

      const config = await this.configCommand.ensureConfig();
      
      if (config.IS_FREE_ACCOUNT) {
        this.timer.start('Checking rate limit');
        const now = Date.now();
        const lastRequest = config.LAST_REQUEST_TIME || 0;
        if (now - lastRequest < 60000) { // 1 minute rate limit
          throw new Error('Rate limit exceeded. Please wait 1 minute between requests on free accounts.');
        }
        this.timer.end('Checking rate limit');
      }

      // Show warning for custom prompt if other options are set
      if (options.customPrompt) {
        const ignoredOptions = [];
        if (options.useType) ignoredOptions.push('useType');
        if (options.emoji) ignoredOptions.push('emoji');
        if (options.scope) ignoredOptions.push('scope');
        if (options.breaking) ignoredOptions.push('breaking');
        if (options.ref) ignoredOptions.push('ref');
        if (options.multiline) ignoredOptions.push('multiline');

        if (ignoredOptions.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warning: The following options will be ignored when using a custom prompt:'));
          console.log(chalk.yellow(`  ${ignoredOptions.join(', ')}`));
          console.log(chalk.gray('  Your custom prompt will be used as-is with the git diff appended.\n'));
        }
      }

      // Show warning if model is overridden
      if (options.model && options.model !== config.MODEL) {
        console.log(chalk.yellow(`\nℹ️  Using model: ${options.model} (overriding configured model: ${config.MODEL || 'default'})\n`));
      }

      this.timer.start('Building prompt');
      const prompt = this.buildPrompt(options);
      this.timer.end('Building prompt');

      this.timer.start('AI request');
      if (!this.service) {
        throw new Error('AI service not initialized');
      }
      const message = await this.service.generateContent(prompt);
      this.timer.end('AI request');

      this.timer.start('Formatting message');
      // Format the message based on options
      let formattedMessage = message.trim();

      // Add scope if specified
      if (options.scope) {
        formattedMessage = formattedMessage.replace(/^(\w+:)/, `$1(${options.scope})`);
      }

      // Add breaking change marker if needed
      if (options.breaking && !formattedMessage.includes('BREAKING CHANGE')) {
        formattedMessage = formattedMessage.replace('\n\n', '\n\nBREAKING CHANGE: ');
      }

      // Add issue/PR reference if needed
      if (options.ref && !formattedMessage.toLowerCase().includes(options.ref.toLowerCase())) {
        formattedMessage += `\n\nRefs: ${options.ref}`;
      }
      this.timer.end('Formatting message');

      // Update last request time for free accounts
      if (config.IS_FREE_ACCOUNT) {
        this.timer.start('Updating rate limit');
        config.LAST_REQUEST_TIME = Date.now();
        this.configCommand.saveConfig(config);
        this.timer.end('Updating rate limit');
      }

      this.timer.end('Generating commit message');
      return formattedMessage;
    } catch (error) {
      throw new Error(`Failed to generate commit message: ${(error as Error).message}`);
    }
  }

  private buildPrompt(options: GenerateMessageOptions): string {
    const { diff, multiline, useType, emoji, scope, breaking, ref, customPrompt } = options;
    
    if (customPrompt) {
      return `${customPrompt}\n\nGit diff:\n${diff}`;
    }

    let prompt = 'Generate a concise git commit message for the following changes. Output only the commit message, with no extra text or formatting.';
    
    if (useType) {
      prompt += '\nUse conventional commit format with an appropriate commit type (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert).';
    }
    
    if (scope) {
      prompt += `\nInclude the scope: (${scope})`;
    }
    
    if (breaking) {
      prompt += '\nThis is a BREAKING CHANGE. Include a "BREAKING CHANGE:" footer with details.';
    }
    
    if (ref) {
      prompt += `\n Include a reference to ${ref} in the footer.`;
    }
    
    if (emoji) {
      prompt += '\nInclude a relevant emoji at the start.';
    }
    
    if (multiline) {
      prompt += '\nProvide a detailed description in the commit body.';
    }

    prompt += '\n\nGit diff:\n' + diff;
    return prompt;
  }
} 