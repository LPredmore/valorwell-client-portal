export class DebugUtils {
  private static sessionId: string = `session-${Math.random().toString(36).substr(2, 9)}`;
  private static logHistory: { timestamp: string, message: string, data?: any, stack?: string }[] = [];

  static generateSessionId(): string {
    return `session-${Math.random().toString(36).substr(2, 9)}`;
  }

  static log(sessionId: string, message: string, data?: any, captureStack: boolean = false): void {
    const timestamp = new Date().toISOString();
    let stack: string | undefined;
    if (captureStack) {
      try {
        throw new Error('Stack trace capture');
      } catch (e) {
        stack = e.stack?.split('\n').slice(2).join('\n');
      }
    }
    const logEntry = { timestamp, message, data, stack };
    this.logHistory.push(logEntry);

    if (this.logHistory.length > 1000) {
      this.logHistory.shift(); // Prevent unbounded memory growth
    }

    console.log(`[${sessionId}] ${timestamp} - ${message}`, data);
    if (stack) {
      console.log(`[${sessionId}] Stack trace:\n${stack}`);
    }
  }

  static exportLogs(): { timestamp: string, message: string, data?: any, stack?: string }[] {
    return this.logHistory;
  }
}
