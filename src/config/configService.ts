import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { Config } from '../types';
import { CONFIG_FILE } from './constants';

export async function setApiKey(key?: string, isFreeAccount?: boolean): Promise<boolean> {
  try {
    let finalKey = key;
    let finalIsFreeAccount = isFreeAccount;

    if (!finalKey || finalIsFreeAccount === undefined) {
      const responses = await inquirer.prompt([
        {
          type: 'input',
          name: 'apiKey',
          message: 'Enter your Gemini API key:',
          validate: (input: string) => input.length > 0 || 'API key cannot be empty',
          when: !finalKey
        },
        {
          type: 'confirm',
          name: 'isFreeAccount',
          message: 'Are you using a free Gemini account?',
          default: true,
          when: finalIsFreeAccount === undefined
        }
      ]);

      finalKey = finalKey || responses.apiKey;
      finalIsFreeAccount = finalIsFreeAccount ?? responses.isFreeAccount ?? true;
    }

    if (!finalKey) {
      throw new Error('API key is required');
    }

    const config: Config = {
      GEMINI_API_KEY: finalKey,
      IS_FREE_ACCOUNT: finalIsFreeAccount ?? true
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(chalk.green('✅ Configuration saved successfully!'));
    return true;
  } catch (error) {
    console.error(chalk.red('Error saving configuration:', (error as Error).message));
    return false;
  }
}

export function getConfig(): Config | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configContent);
      
      if (!config.GEMINI_API_KEY || config.IS_FREE_ACCOUNT === undefined) {
        return null;
      }

      return config as Config;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function updateConfig(updates: Partial<Config>): boolean {
  try {
    const currentConfig = getConfig() || {};
    const newConfig = { ...currentConfig, ...updates };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    return true;
  } catch (error) {
    return false;
  }
}

export function findEnvFile(): string | null {
  // Try current directory first
  if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    return path.join(process.cwd(), '.env');
  }

  // Try the config directory
  if (fs.existsSync(CONFIG_FILE)) {
    return CONFIG_FILE;
  }

  // Try the directory where the CLI is installed
  const installPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(installPath)) {
    return installPath;
  }

  return null;
} 