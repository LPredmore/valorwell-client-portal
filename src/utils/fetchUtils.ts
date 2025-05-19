
import { toast } from 'sonner';

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: any, retryCount: number) => void;
  onFinalError?: (error: any) => void;
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Executes a fetch operation with configurable retry logic and exponential backoff
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onError, onFinalError } = config;
  let retries = 0;
  let lastError: any;

  while (retries <= maxRetries) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;
      retries++;
      
      // If we've reached max retries, break and throw the error
      if (retries > maxRetries) {
        break;
      }

      // Log the retry attempt
      console.log(`Fetch attempt ${retries} failed. Retrying in ${retryDelay * Math.pow(2, retries - 1)}ms`);
      
      // Call the onError callback if provided
      if (onError) {
        onError(error, retries);
      }
      
      // Wait with exponential backoff before retrying
      await new Promise((resolve) => {
        setTimeout(resolve, retryDelay * Math.pow(2, retries - 1));
      });
    }
  }

  // All retries exhausted, call onFinalError if provided
  if (onFinalError) {
    onFinalError(lastError);
  }

  throw lastError;
}

// Create a map to store debounce timers
const debounceTimers: Record<string, NodeJS.Timeout> = {};

/**
 * Debounces a function call, ensuring it only executes after a specified delay
 * since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
  key: string = 'default'
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>): void => {
    if (debounceTimers[key]) {
      clearTimeout(debounceTimers[key]);
    }

    debounceTimers[key] = setTimeout(() => {
      fn(...args);
      delete debounceTimers[key];
    }, delay);
  };
}
