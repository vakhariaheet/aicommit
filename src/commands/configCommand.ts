import { Config, ConfigKey, COMMIT_TYPES, OPENAI_MODELS, GEMINI_MODELS } from '../types';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { formatError } from '../utils/error';
import { AIProvider } from '../services/aiServiceFactory';

type DefaultKey = 'push' | 'multiline' | 'verbose' | 'emoji' | 'breaking' | 'type' | 'scope' | 'customPrompt';

export class ConfigCommand {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.aicommit');
  }

  readConfig(): Config | null {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      return null;
    }
  }

  saveConfig(config: Config): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw formatError('Failed to write config file', error);
    }
  }

  async ensureConfig(): Promise<Config> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.setupInitialConfig();
      }
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (!config.AI_PROVIDER || (!config.GEMINI_API_KEY && !config.OPENAI_API_KEY)) {
        return this.setupInitialConfig();
      }
      return config;
    } catch (error) {
      return this.setupInitialConfig();
    }
  }

  private async setupInitialConfig(): Promise<Config> {
    console.log(chalk.blue('\n🔧 Welcome to aicommit! Let\'s set up your configuration.\n'));

    const { provider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: '🤖 Select your preferred AI provider:',
        choices: [
          { name: 'Google Gemini', value: 'gemini' },
          { name: 'OpenAI', value: 'openai' }
        ]
      }
    ]);

    const defaultModel = provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-3.5-turbo';

    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: '🧠 Select your preferred model:',
        default: defaultModel,
        
      }
    ]);

    const apiKeyQuestion = provider === 'gemini' 
      ? {
          type: 'input',
          name: 'GEMINI_API_KEY',
          message: '🔑 Enter your Gemini API key:',
          validate: (input: string) => input.length > 0 || 'API key is required'
        }
      : {
          type: 'input',
          name: 'OPENAI_API_KEY',
          message: '🔑 Enter your OpenAI API key:',
          validate: (input: string) => input.length > 0 || 'API key is required'
        };

    const answers = await inquirer.prompt([
      apiKeyQuestion,
      {
        type: 'confirm',
        name: 'IS_FREE_ACCOUNT',
        message: '💰 Are you using a free API account?',
        default: true
      },
      {
        type: 'confirm',
        name: 'defaults.useType',
        message: '📝 Do you want to include commit types in your commit messages? (e.g., feat:, fix:)',
        default: true
      },
      {
        type: 'confirm',
        name: 'defaults.emoji',
        message: '😊 Do you want to include emojis in commit messages?',
        default: true
      },
      {
        type: 'confirm',
        name: 'defaults.multiline',
        message: '📄 Generate detailed multiline commit messages by default?',
        default: false
      },
      {
        type: 'confirm',
        name: 'defaults.push',
        message: '🚀 Push changes automatically after commit?',
        default: false
      },
      {
        type: 'confirm',
        name: 'wantCustomPrompt',
        message: chalk.yellow('\n⚠️  Would you like to set a custom prompt?\n   Note: When using a custom prompt, formatting options like commit types, emoji, scope, etc. will be ignored.'),
        default: false
      }
    ]);

    let config: Config = {
      AI_PROVIDER: provider,
      IS_FREE_ACCOUNT: answers.IS_FREE_ACCOUNT,
      MODEL: model,
      defaults: {
        useType: answers.defaults.useType,
        emoji: answers.defaults.emoji,
        multiline: answers.defaults.multiline,
        push: answers.defaults.push
      }
    };

    if (provider === 'gemini') {
      config.GEMINI_API_KEY = answers.GEMINI_API_KEY;
    } else {
      config.OPENAI_API_KEY = answers.OPENAI_API_KEY;
    }

    if (answers.wantCustomPrompt) {
      const customPromptAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'customPrompt',
          message: '✍️  Enter your custom prompt:',
          validate: (input: string) => input.length > 0 || 'Custom prompt cannot be empty'
        }
      ]);
      if (config.defaults) {
        config.defaults.customPrompt = customPromptAnswer.customPrompt;
      }
    }

    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green('\n✅ Configuration saved successfully!\n'));
    
    return config;
  }

  setApiKey(key: string, provider?: AIProvider): void {
    const config = this.readConfig() || this.getDefaultConfig();
    if (provider) {
      config.AI_PROVIDER = provider;
      if (provider === 'gemini') {
        config.GEMINI_API_KEY = key;
        delete config.OPENAI_API_KEY;
      } else {
        config.OPENAI_API_KEY = key;
        delete config.GEMINI_API_KEY;
      }
    } else {
      if (config.AI_PROVIDER === 'gemini') {
        config.GEMINI_API_KEY = key;
      } else {
        config.OPENAI_API_KEY = key;
      }
    }
    this.saveConfig(config);
    console.log(chalk.green('✅ API key updated successfully!'));
  }

  setModel(model: string): void {
    const config = this.readConfig() || this.getDefaultConfig();
    const validModels = config.AI_PROVIDER === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
    
    const isValidModel = validModels.some(validModel => validModel === model);
    if (!isValidModel) {
      const availableModels = validModels.join(', ');
      throw new Error(`Invalid model for ${config.AI_PROVIDER}. Available models: ${availableModels}`);
    }

    config.MODEL = model;
    this.saveConfig(config);
    console.log(chalk.green(`✅ Model updated to "${model}" successfully!`));
  }

  setDefault(key: string, value: string): void {
    const config = this.readConfig() || this.getDefaultConfig();
    if (!config.defaults) {
      config.defaults = {};
    }

    // Convert string value to appropriate type
    let typedValue: any = value;
    if (value === 'true') typedValue = true;
    else if (value === 'false') typedValue = false;

    (config.defaults as any)[key] = typedValue;
    this.saveConfig(config);
    console.log(chalk.green(`✅ Default value for "${key}" set to "${value}"`));
  }

  removeDefault(key: string): void {
    const config = this.readConfig() || this.getDefaultConfig();
    if (config.defaults && key in config.defaults) {
      delete (config.defaults as any)[key];
      this.saveConfig(config);
      console.log(chalk.green(`✅ Default value for "${key}" removed`));
    } else {
      console.log(chalk.yellow(`⚠️ No default value found for "${key}"`));
    }
  }

  listDefaults(): void {
    const config = this.readConfig() || this.getDefaultConfig();
    console.log('\nCurrent Configuration:');
    console.log('--------------------');
    console.log('AI Provider:', config.AI_PROVIDER);
    if (config.AI_PROVIDER === 'gemini') {
      console.log('Gemini API Key:', config.GEMINI_API_KEY ? '********' : 'Not set');
      console.log('Model:', config.MODEL || 'gemini-2.0-flash (default)');
      console.log('\nAvailable Gemini Models:', GEMINI_MODELS.join(', '));
    } else {
      console.log('OpenAI API Key:', config.OPENAI_API_KEY ? '********' : 'Not set');
      console.log('Model:', config.MODEL || 'gpt-3.5-turbo (default)');
      console.log('\nAvailable OpenAI Models:', OPENAI_MODELS.join(', '));
    }
    console.log('\nAccount Type:', config.IS_FREE_ACCOUNT ? 'Free' : 'Paid');
    console.log('\nDefault Values:');
    if (config.defaults && Object.keys(config.defaults).length > 0) {
      Object.entries(config.defaults).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    } else {
      console.log('No default values set');
    }
    console.log();
  }

  private getDefaultConfig(): Config {
    return {
      AI_PROVIDER: 'gemini',
      IS_FREE_ACCOUNT: true,
      MODEL: 'gemini-2.0-flash',
      defaults: {}
    };
  }

  getDefaults(): Config['defaults'] {
    try {
      const config = this.readConfig();
      return config?.defaults || {};
    } catch (error) {
      throw formatError('Failed to get default values', error);
    }
  }
} 