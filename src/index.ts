#!/usr/bin/env node

import { program } from 'commander';
import { CommitCommand } from './commands/commitCommand';
import { ConfigCommand } from './commands/configCommand';
import { COMMIT_TYPES, GEMINI_MODELS, OPENAI_MODELS } from './types';
import { AIProvider } from './services/aiServiceFactory';
import chalk from 'chalk';

const configCommand = new ConfigCommand();
const commitCommand = new CommitCommand();

async function main() {
  try {
    // Ensure config exists
    const config = await configCommand.ensureConfig();
    const defaults = config.defaults;

    program
      .name('aicommit')
      .version('0.0.2')
      .description('Generate and create a commit with an AI-generated message')
      .option('-p, --push', 'Push changes after commit', defaults?.push)
      .option('-m, --multiline', 'Generate a detailed multiline commit message', defaults?.multiline)
      .option('-d, --dry-run', 'Show what would be done without making actual changes')
      .option('-v, --verbose', 'Show detailed progress information', defaults?.verbose)
      .option('-a, --amend', 'Amend the last commit')
      .option('-f, --files <files>', 'Comma-separated list of files to commit')
      .option('--use-type', 'Use conventional commit format with AI-selected type', defaults?.useType)
      .option('-e, --emoji', 'Include emoji in commit message', defaults?.emoji ?? true)
      .option('--no-emoji', 'Disable emoji in commit message')
      .option('-s, --scope <scope>', 'Specify commit scope', defaults?.scope)
      .option('-b, --breaking', 'Mark as breaking change', defaults?.breaking)
      .option('-r, --ref <reference>', 'Add issue/PR reference')
      .option('--revert', 'Revert last commit')
      .option('-c, --custom-prompt <prompt>', 'Provide custom prompt for AI (other formatting options will be ignored)', defaults?.customPrompt)
      .option('--model <model>', 'Use a specific AI model for this commit')
      .addHelpText('after', `
    Usage Examples:
      $ aicommit                           Generate commit message for staged changes
      $ aicommit -p                        Commit and push changes
      $ aicommit --use-type -s auth       Create commit with AI-selected type and auth scope
      $ aicommit -m -b                     Create multiline breaking change commit
      $ aicommit -f "file1.ts,file2.ts"   Commit specific files
      $ aicommit -a                        Amend last commit
      $ aicommit --revert                  Revert last commit
      $ aicommit -r "#123"                 Reference issue/PR in commit

    Available Commit Types (when using --use-type):
      ${COMMIT_TYPES.map(type => `${type}`).join(', ')}

    Flag Combinations:
      Basic:
        -p, --push              Push changes after commit
        -m, --multiline         Generate detailed commit message
        -d, --dry-run          Show what would be done without changes
        -v, --verbose          Show detailed progress information
        -a, --amend            Amend the last commit
        
      Commit Content:
        -f, --files            Specify files to commit (comma-separated)
        --use-type            Use conventional commit format with AI-selected type
        -s, --scope           Commit scope (e.g., auth, ui)
        -b, --breaking        Mark as breaking change
        -r, --ref             Add issue/PR reference
        
      Message Style:
        -e, --emoji           Include emoji (default: true)
        --no-emoji           Disable emoji
        -c, --custom-prompt   Custom prompt for AI (other formatting options will be ignored)

    Note:
      When using --custom-prompt, other formatting options (--use-type, --emoji, --scope, etc.) will be ignored.
      The custom prompt will be used as-is with the git diff appended.

    Configuration:
      All flags can have default values set using:
      $ aicommit config --set-default "flag=value"

    Environment Variables:
      GEMINI_API_KEY         Your Google Gemini API key
    `)
      .action(async (options) => {
        try {
          await commitCommand.execute(options);
        } catch (error) {
          console.error(chalk.red(`\n❌ Error: ${(error as Error).message}\n`));
          process.exit(1);
        }
      });

    program
      .command('config')
      .description('Configure aicommit settings (use --list to see current configuration) or you can directly update the configuration file')
      .option('-k, --key <key>', 'Set API key')
      .option('-p, --provider <provider>', 'Set AI provider (gemini or openai)')
      .option('-m, --model <model>', 'Set AI model')
      .option('-s, --set <key> <value>', 'Set a default value')
      .option('-r, --remove <key>', 'Remove a default value')
      .option('-l, --list', 'List current configuration')
      .addHelpText('after', `
    Configuration Options:
      --api-key <key>              Set your Gemini API key
      --set-default <key=value>    Set default value for a flag
      --remove-default <key>       Remove default value for a flag
      --list                       Show current configuration

    Default Value Keys:
      push         - Push changes after commit (true/false)
      multiline    - Generate detailed commit messages (true/false)
      verbose      - Show detailed progress (true/false)
      useType     - Use conventional commit format (true/false)
      emoji        - Include emoji in messages (true/false)
      scope        - Default commit scope (string)
      breaking     - Mark as breaking change (true/false)
      customPrompt - Default custom prompt (string)

    Examples:
      $ aicommit config --api-key "your-api-key"
      $ aicommit config --set-default "push=true"
      $ aicommit config --set-default "useType=true"
      $ aicommit config --set-default "scope=auth"
      $ aicommit config --remove-default push
      $ aicommit config --list

    Configuration File:
      The configuration is stored in ~/.aicommit
    `)
      .action((options) => {
        try {
          if (options.key) {
            configCommand.setApiKey(options.key, options.provider as AIProvider);
          } else if (options.model) {
            configCommand.setModel(options.model);
          } else if (options.set) {
            configCommand.setDefault(options.set[0], options.set[1]);
          } else if (options.remove) {
            configCommand.removeDefault(options.remove);
          } else if (options.list) {
            configCommand.listDefaults();
          } else if (options.provider) {
            console.log(chalk.yellow('\nℹ️  When changing provider, you also need to set an API key:'));
            console.log(chalk.gray(`  aicommit config --provider ${options.provider} --key YOUR_API_KEY\n`));
          } else {
            configCommand.ensureConfig();
          }
        } catch (error) {
          console.error(chalk.red(`\n❌ Error: ${(error as Error).message}\n`));
          if (options.model) {
            const config = configCommand.readConfig();
            if (config) {
              const models = config.AI_PROVIDER === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;
              console.log(chalk.yellow('Available models:'));
              console.log(chalk.gray(models.join(', ')), '\n');
            }
          }
          process.exit(1);
        }
      });

    program.parse();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main(); 