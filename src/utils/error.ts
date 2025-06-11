export function formatError(message: string, error: unknown): Error {
  if (error instanceof Error) {
    return new Error(`${message}: ${error.message}`);
  }
  return new Error(message);
} 