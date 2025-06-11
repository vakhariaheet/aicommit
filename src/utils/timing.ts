import chalk from 'chalk';

export class Timer {
  private startTime: number;
  public isVerbose: boolean;

  constructor(isVerbose: boolean = false) {
    this.startTime = Date.now();
    this.isVerbose = isVerbose;
  }

  start(operation: string): void {
    if (this.isVerbose) {
      console.log(chalk.gray(`⏱️  Starting: ${operation}...`));
    }
    this.startTime = Date.now();
  }

  end(operation: string): void {
    if (this.isVerbose) {
      const duration = Date.now() - this.startTime;
      console.log(chalk.gray(`✓ Completed: ${operation} (${duration}ms)`));
    }
  }
} 