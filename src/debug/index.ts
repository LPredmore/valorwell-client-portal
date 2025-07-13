import DebugUtils, { isDebugEnabled, loadDebugModule } from './debugUtils';
import { debugAuthOperation } from './authDebugUtils';
import { testAuthFixes, verifyAuthInitializedFlag } from './authFixesTest';

/**
 * Consolidated debug utilities for the application
 * This module provides specialized debug utilities for different parts of the application
 */

// Export core debug utilities
export { DebugUtils, isDebugEnabled, loadDebugModule };

// Export auth debug utilities
export const AuthDebug = {
  log: (message: string, data?: any) => DebugUtils.log('Auth', message, data),
  error: (message: string, error?: any) => DebugUtils.error('Auth', message, error),
  warn: (message: string, data?: any) => DebugUtils.warn('Auth', message, data),
  info: (message: string, data?: any) => DebugUtils.info('Auth', message, data),
  operation: debugAuthOperation,
  testAuthFixes,
  verifyAuthInitializedFlag
};

// Export general utilities
export const GeneralDebug = {
  compareDataStructures: (expected: any, actual: any, context = 'DataComparison') => {
    DebugUtils.log(context, 'Comparing data structures');
    
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
      DebugUtils.log(context, 'Data structures match');
      return true;
    } else {
      DebugUtils.warn(context, 'Data structures do not match', {
        expected,
        actual,
        diff: {
          expectedKeys: Object.keys(expected || {}),
          actualKeys: Object.keys(actual || {})
        }
      });
      return false;
    }
  },
  
  validateParameters: (hookName: string, params: any, requiredParams: string[]) => {
    const missingParams = requiredParams.filter(param => !(param in params));
    
    if (missingParams.length > 0) {
      DebugUtils.error(hookName, `Missing required parameters: ${missingParams.join(', ')}`, params);
      return false;
    }
    
    DebugUtils.log(hookName, 'All required parameters present', params);
    return true;
  }
};

// Helper to conditionally log based on environment
export function debugLog(context: string, message: string, data?: any): void {
  if (isDebugEnabled) {
    DebugUtils.log(context, message, data);
  }
}

export default DebugUtils;