import { exec } from 'child_process';
import { promisify } from 'util';
import { CommitOptions } from '../types';
import { AIService } from '../services/aiService';
import { Timer } from '../utils/timing';
import chalk from 'chalk';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

export class CommitCommand {
  private aiService: AIService;
  private timer: Timer;

  constructor() {
    this.timer = new Timer(false);
    this.aiService = new AIService(false);
  }

  async execute(options: CommitOptions): Promise<void> {
    try {
      if (options.verbose) {
        console.log(options);
      }
      // Reinitialize with verbose option
      this.timer = new Timer(options.verbose);
      this.aiService = new AIService(options.verbose);

      // Handle revert case first
      if (options.revert) {
        this.timer.start('Reverting last commit');
        await this.revertLastCommit(options.push);
        this.timer.end('Reverting last commit');
        return;
      }

      // Get the diff for staged changes
      this.timer.start('Getting git diff');
      const diff = await this.getGitDiff(options.files);
      
      if (!diff) {
        throw new Error('No changes to commit. Please stage your changes first.');
      }
      this.timer.end('Getting git diff');

      // Generate commit message
      this.timer.start('Generating commit message');
      const message = await this.aiService.generateCommitMessage({
        diff,
        multiline: options.multiline || false,
        useType: options.useType,
        emoji: options.emoji,
        scope: options.scope,
        breaking: options.breaking,
        ref: options.ref,
        customPrompt: options.customPrompt
      });
      this.timer.end('Generating commit message');

      if (options.dryRun) {
        console.log('\n📝 Generated commit message:');
        console.log('------------------------');
        console.log(message);
        console.log('------------------------');
        return;
      }

      // Show confirmation prompt
      const result = await this.confirmCommit(message);
      
      if (result.action === 'cancel') {
        console.log(chalk.yellow('\n🚫 Commit cancelled'));
        return;
      }

      const finalMessage = result.action === 'edit' ? result.editedMessage : message;

      // Create the commit
      this.timer.start('Creating commit');
      if (options.amend) {
        await this.amendCommit(finalMessage);
      } else {
        await this.createCommit(finalMessage);
      }
      this.timer.end('Creating commit');

      // Push if requested
      if (options.push) {
        this.timer.start('Pushing changes');
        await this.pushChanges(options.amend);
        this.timer.end('Pushing changes');
      }

      console.log(chalk.green('\n✨ Done!'));
    } catch (error) {
      throw new Error(`Failed to create commit: ${(error as Error).message}`);
    }
  }

  private async confirmCommit(message: string): Promise<{ action: 'proceed' | 'edit' | 'cancel'; editedMessage: string }> {
    console.log('\n📝 Generated commit message:');
    console.log('------------------------');
    console.log(message);
    console.log('------------------------');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✅ Proceed with this message', value: 'proceed' },
          { name: '✏️  Edit message', value: 'edit' },
          { name: '❌ Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'edit') {
      const { editedMessage } = await inquirer.prompt([
        {
          type: 'editor',
          name: 'editedMessage',
          message: 'Edit your commit message:',
          default: message,
          validate: (input: string) => input.trim().length > 0 || 'Commit message cannot be empty'
        }
      ]);
      return { action, editedMessage: editedMessage.trim() };
    }

    return { action, editedMessage: message };
  }

  private async getGitDiff(files?: string): Promise<string> {
    try {
      let command = 'git diff --staged';
      if (files) {
        command += ` -- ${files}`;
      }
      const { stdout } = await execAsync(command);
      return stdout;
    } catch (error) {
      throw new Error(`Failed to get git diff: ${(error as Error).message}`);
    }
  }

  private async createCommit(message: string): Promise<void> {
    try {
      await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`);
    } catch (error) {
      throw new Error(`Failed to create commit: ${(error as Error).message}`);
    }
  }

  private async amendCommit(message: string): Promise<void> {
    try {
      await execAsync(`git commit --amend -m "${message.replace(/"/g, '\\"')}"`);
    } catch (error) {
      throw new Error(`Failed to amend commit: ${(error as Error).message}`);
    }
  }

  private async pushChanges(amend: boolean = false): Promise<void> {
    try {
      if (amend) {
        await execAsync('git push --force');
      } else {
        await execAsync('git push');
      }
    } catch (error) {
      throw new Error(`Failed to push changes: ${(error as Error).message}`);
    }
  }

  private async revertLastCommit(push: boolean = false): Promise<void> {
    try {
      await execAsync('git revert HEAD --no-edit');
      if (push) {
        await execAsync('git push');
      }
    } catch (error) {
      throw new Error(`Failed to revert last commit: ${(error as Error).message}`);
    }
  }
} 