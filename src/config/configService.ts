import fs from 'fs';
import path from 'path';

import { Config } from '../types';
import { CONFIG_FILE } from './constants';
import { AIProvider } from '../services/aiServiceFactory';



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