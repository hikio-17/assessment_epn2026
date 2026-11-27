import { isSerializationFailure } from "./errors";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryOnSerializationFailure<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (
        !isSerializationFailure(error) ||
        attempt === attempts
      ) {
        throw error;
      }

      await sleep(attempt * 15);
    }
  }

  throw lastError;
}