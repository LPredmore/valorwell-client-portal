
/**
 * Debug utility functions for logging and troubleshooting
 */
export class DebugUtils {
  // Set to true to enable verbose logging
  static VERBOSE: boolean = false;

  /**
   * Generate a unique session ID for debugging
   */
  static generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Log a message to the console if debugging is enabled
   */
  static log(sessionId: string, message: string, data?: any, isError: boolean = false): void {
    if (isError || this.VERBOSE) {
      const timestamp = new Date().toISOString();
      const prefix = isError ? '❌ [ERROR]' : '🔍 [DEBUG]';
      
      if (data) {
        console.log(`${timestamp} ${prefix} [${sessionId}] ${message}`, data);
      } else {
        console.log(`${timestamp} ${prefix} [${sessionId}] ${message}`);
      }
    }
  }
  
  /**
   * Log an error message to the console
   */
  static error(sessionId: string, message: string, error?: any): void {
    this.log(sessionId, message, error, true);
  }

  /**
   * Log a warning message to the console
   */
  static warn(sessionId: string, message: string, data?: any): void {
    if (this.VERBOSE) {
      const timestamp = new Date().toISOString();
      const prefix = '⚠️ [WARNING]';
      
      if (data) {
        console.warn(`${timestamp} ${prefix} [${sessionId}] ${message}`, data);
      } else {
        console.warn(`${timestamp} ${prefix} [${sessionId}] ${message}`);
      }
    }
  }

  /**
   * Log an informational message to the console
   */
  static info(sessionId: string, message: string, data?: any): void {
    if (this.VERBOSE) {
      const timestamp = new Date().toISOString();
      const prefix = '📝 [INFO]';
      
      if (data) {
        console.info(`${timestamp} ${prefix} [${sessionId}] ${message}`, data);
      } else {
        console.info(`${timestamp} ${prefix} [${sessionId}] ${message}`);
      }
    }
  }
}
