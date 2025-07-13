/**
 * Centralized debug utility class
 * Contains common debugging functionality
 */

const VERBOSE = true; // Set to false in production

export class DebugUtils {
  static log(context: string, message: string, data?: any) {
    if (VERBOSE) {
      console.log(`[${context}] ${message}`, data || '');
    }
  }

  static error(context: string, message: string, error?: any) {
    console.error(`[${context}] ${message}`, error || '');
  }

  static warn(context: string, message: string, data?: any) {
    if (VERBOSE) {
      console.warn(`[${context}] ${message}`, data || '');
    }
  }

  static info(context: string, message: string, data?: any) {
    if (VERBOSE) {
      console.info(`[${context}] ${message}`, data || '');
    }
  }

  static time(label: string) {
    if (VERBOSE) {
      console.time(label);
    }
  }

  static timeEnd(label: string) {
    if (VERBOSE) {
      console.timeEnd(label);
    }
  }

  static group(label: string) {
    if (VERBOSE) {
      console.group(label);
    }
  }

  static groupEnd() {
    if (VERBOSE) {
      console.groupEnd();
    }
  }

  static table(data: any) {
    if (VERBOSE) {
      console.table(data);
    }
  }
}

/**
 * Utility to check if debug mode is enabled
 */
export const isDebugEnabled = VERBOSE;

/**
 * Conditionally load debug modules only in debug mode
 */
export const loadDebugModule = async (moduleLoader: () => Promise<any>) => {
  if (isDebugEnabled) {
    return await moduleLoader();
  }
  return null;
};

export default DebugUtils;