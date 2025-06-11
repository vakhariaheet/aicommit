import { execSync, spawn } from 'child_process';
import { formatError } from '../utils/error';

export class GitService {
  getDiff(files?: string): string {
    try {
      if (files) {
        // Stage specified files first
        const fileList = files.split(',').map(f => f.trim());
        fileList.forEach(file => {
          execSync(`git add "${file}"`);
        });
      }
      
      // Get diff of staged changes
      return execSync('git diff --cached').toString();
    } catch (error) {
      throw formatError('Failed to get git diff', error);
    }
  }

  async commit(message: string, options: { 
    amend?: boolean, 
    push?: boolean,
    verbose?: boolean,
    dryRun?: boolean
  } = {}): Promise<void> {
    try {
      const { amend, push, verbose, dryRun } = options;
      
      if (verbose) {
        console.log('Commit message:', message);
        console.log('Options:', options);
      }

      if (dryRun) {
        console.log('Dry run - would commit with message:', message);
        console.log('Options:', options);
        return;
      }

      // Create git commit command array
      const args = amend 
        ? ['commit', '--amend', '-m', message]
        : ['commit', '-m', message];

      // Use spawn for better command handling
      const gitCommit = spawn('git', args);

      await new Promise<void>((resolve, reject) => {
        gitCommit.on('error', reject);
        gitCommit.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Git commit failed with code ${code}`));
          }
        });
      });

      if (push) {
        const pushCmd = amend ? 'git push --force' : 'git push';
        if (verbose) console.log('Pushing changes...');
        execSync(pushCmd);
      }
    } catch (error) {
      throw formatError('Failed to commit changes', error);
    }
  }

  getLastCommitMessage(): string {
    try {
      return execSync('git log -1 --pretty=%B').toString().trim();
    } catch (error) {
      throw formatError('Failed to get last commit message', error);
    }
  }

  revertLastCommit(): void {
    try {
      execSync('git reset --soft HEAD~1');
    } catch (error) {
      throw formatError('Failed to revert last commit', error);
    }
  }

  hasUncommittedChanges(): boolean {
    try {
      const status = execSync('git status --porcelain').toString();
      return status.length > 0;
    } catch (error) {
      throw formatError('Failed to check git status', error);
    }
  }
} 