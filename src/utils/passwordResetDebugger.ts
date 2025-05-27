
/**
 * Password Reset Debugging Utilities
 * Helps diagnose email delivery issues
 */

export interface PasswordResetDebugInfo {
  timestamp: string;
  email: string;
  processedEmail: string;
  emailValidation: {
    isValid: boolean;
    hasSpecialChars: boolean;
    emailFormat: string;
  };
  networkRequest: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  };
  supabaseResponse: {
    data: any;
    error: any;
    status?: number;
  };
  browserInfo: {
    userAgent: string;
    isIncognito: boolean;
    extensionsDetected: boolean;
  };
  configuration: {
    redirectTo: string;
    currentOrigin: string;
    isProduction: boolean;
  };
}

/**
 * Detects if browser is in incognito/private mode
 */
export const detectIncognitoMode = async (): Promise<boolean> => {
  try {
    // Try to access webkitRequestFileSystem (Chrome/Edge)
    if ('webkitRequestFileSystem' in window) {
      return new Promise((resolve) => {
        (window as any).webkitRequestFileSystem(
          (window as any).TEMPORARY,
          1,
          () => resolve(false),
          () => resolve(true)
        );
      });
    }
    
    // Try to check if localStorage quota is reduced (Firefox)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      // In incognito mode, quota is usually much smaller
      return estimate.quota !== undefined && estimate.quota < 120000000; // ~120MB
    }
    
    // Fallback detection methods
    try {
      localStorage.setItem('__incognito_test__', 'test');
      localStorage.removeItem('__incognito_test__');
      return false;
    } catch {
      return true;
    }
  } catch {
    return false;
  }
};

/**
 * Detects browser extensions that might interfere
 */
export const detectBrowserExtensions = (): boolean => {
  // Check for common extension-related indicators
  const indicators = [
    // Check for modified globals that extensions often add
    'chrome' in window && 'runtime' in (window as any).chrome,
    // Check for extension content script indicators
    document.documentElement.hasAttribute('data-extension'),
    document.documentElement.hasAttribute('data-adblock'),
    // Check for common extension CSS classes
    document.querySelector('[class*="extension"]') !== null,
    document.querySelector('[class*="adblock"]') !== null,
    // Check console for extension errors (like the ones we see)
    console.log.toString().includes('extension') // This won't work but shows the concept
  ];
  
  return indicators.some(indicator => indicator);
};

/**
 * Monitors network requests for password reset
 */
export const monitorPasswordResetRequest = (email: string): Promise<PasswordResetDebugInfo> => {
  return new Promise(async (resolve) => {
    const debugInfo: Partial<PasswordResetDebugInfo> = {
      timestamp: new Date().toISOString(),
      email,
      browserInfo: {
        userAgent: navigator.userAgent,
        isIncognito: await detectIncognitoMode(),
        extensionsDetected: detectBrowserExtensions()
      }
    };

    // Log comprehensive browser environment
    console.log("[PasswordResetDebugger] Browser Environment:", debugInfo.browserInfo);
    
    // Check for console errors that might indicate extension interference
    const originalConsoleError = console.error;
    const consoleErrors: string[] = [];
    
    console.error = (...args) => {
      consoleErrors.push(args.map(arg => String(arg)).join(' '));
      originalConsoleError.apply(console, args);
    };
    
    // Restore original console.error after a short delay
    setTimeout(() => {
      console.error = originalConsoleError;
      console.log("[PasswordResetDebugger] Captured console errors:", consoleErrors);
    }, 5000);
    
    resolve(debugInfo as PasswordResetDebugInfo);
  });
};

/**
 * Tests email delivery with different formats
 */
export const testEmailFormats = (baseEmail: string): string[] => {
  const [localPart, domain] = baseEmail.split('@');
  
  const testFormats = [
    baseEmail, // Original format
    baseEmail.replace(/\+.*?@/, '@'), // Remove plus addressing
    localPart.replace(/\./g, '') + '@' + domain, // Remove dots from local part
    localPart.toLowerCase() + '@' + domain.toLowerCase(), // Ensure lowercase
  ];
  
  // Remove duplicates
  return [...new Set(testFormats)];
};

/**
 * Provides troubleshooting recommendations
 */
export const getPasswordResetTroubleshooting = (debugInfo: PasswordResetDebugInfo): string[] => {
  const recommendations: string[] = [];
  
  if (debugInfo.browserInfo?.extensionsDetected) {
    recommendations.push("Browser extensions detected - try in incognito/private mode");
  }
  
  if (debugInfo.browserInfo?.isIncognito === false) {
    recommendations.push("Try password reset in incognito/private browsing mode");
  }
  
  if (debugInfo.emailValidation?.hasSpecialChars) {
    recommendations.push("Email contains special characters (+) - try with an alternative email");
  }
  
  if (debugInfo.supabaseResponse?.error) {
    recommendations.push(`Supabase error detected: ${debugInfo.supabaseResponse.error.message}`);
  }
  
  if (!recommendations.length) {
    recommendations.push("Check all email folders including spam, junk, and promotions");
    recommendations.push("Wait 5-10 minutes for email delivery");
    recommendations.push("Try with a different email provider (not Gmail)");
  }
  
  return recommendations;
};

/**
 * Comprehensive email delivery test
 */
export const runEmailDeliveryDiagnostics = async (email: string) => {
  console.log("=== Starting Email Delivery Diagnostics ===");
  
  const testFormats = testEmailFormats(email);
  console.log("Email formats to test:", testFormats);
  
  const browserInfo = {
    userAgent: navigator.userAgent,
    isIncognito: await detectIncognitoMode(),
    extensionsDetected: detectBrowserExtensions(),
    cookiesEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
  
  console.log("Browser diagnostics:", browserInfo);
  
  // Check localStorage/sessionStorage availability
  const storageInfo = {
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        return 'available';
      } catch {
        return 'blocked';
      }
    })(),
    sessionStorage: (() => {
      try {
        sessionStorage.setItem('test', 'test');
        sessionStorage.removeItem('test');
        return 'available';
      } catch {
        return 'blocked';
      }
    })()
  };
  
  console.log("Storage diagnostics:", storageInfo);
  
  return {
    email,
    testFormats,
    browserInfo,
    storageInfo,
    recommendations: [
      "Test in incognito mode to eliminate extension interference",
      "Check all email folders thoroughly",
      "Try alternative email format without + sign",
      "Wait 10-15 minutes for email delivery",
      "Test with non-Gmail email provider"
    ]
  };
};
