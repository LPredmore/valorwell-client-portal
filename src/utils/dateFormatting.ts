
import { parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Utility functions for consistent date/time formatting across the application
 */

/**
 * Robust timezone converter with multiple fallback methods
 * @param utcTimestamp - ISO string timestamp in UTC
 * @param clientTimezone - IANA timezone identifier
 * @param format - desired format pattern
 * @returns Formatted date string in client's timezone
 */
const convertWithNativeAPI = (utcTimestamp: string, clientTimezone: string, format: string): string | null => {
  try {
    const utcDate = new Date(utcTimestamp);
    
    // Use native Intl.DateTimeFormat for timezone conversion
    if (format === 'h:mm a' || format === 'H:mm') {
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: clientTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: format === 'h:mm a'
      });
      return timeFormatter.format(utcDate);
    }
    
    if (format === 'MM/dd/yyyy h:mm a') {
      const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: clientTimezone,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return dateTimeFormatter.format(utcDate);
    }
    
    if (format === 'MM/dd/yyyy') {
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: clientTimezone,
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
      return dateFormatter.format(utcDate);
    }
    
    return null; // Format not supported by native API
  } catch (error) {
    console.warn('Native API conversion failed:', error);
    return null;
  }
};

/**
 * Formats a UTC timestamp string to display in the client's timezone
 * @param utcTimestamp - ISO string timestamp in UTC (e.g., "2025-07-03T06:00:00.000Z")
 * @param clientTimezone - IANA timezone identifier (e.g., "America/Chicago")
 * @param format - date-fns format string (default: "MM/dd/yyyy h:mm a")
 * @returns Formatted date string in client's timezone
 */
export const formatInClientTimezone = (
  utcTimestamp: string,
  clientTimezone: string,
  format: string = 'MM/dd/yyyy h:mm a'
): string => {
  try {
    console.log('🔧 formatInClientTimezone Debug:', {
      input: utcTimestamp,
      timezone: clientTimezone,
      format
    });
    
    // Method 1: Try native browser API first (most reliable)
    const nativeResult = convertWithNativeAPI(utcTimestamp, clientTimezone, format);
    if (nativeResult) {
      console.log('🔧 Native API result:', nativeResult);
      return nativeResult;
    }
    
    // Method 2: Fallback to date-fns-tz with proper UTC handling
    let cleanUtcString = utcTimestamp;
    if (utcTimestamp.includes('+') || utcTimestamp.endsWith('Z')) {
      cleanUtcString = utcTimestamp.replace(/[+-]\d{2}:\d{2}$|Z$/, '') + 'Z';
    }
    
    console.log('🔧 Fallback to date-fns-tz with cleaned string:', cleanUtcString);
    
    const utcDate = parseISO(cleanUtcString);
    const result = formatInTimeZone(utcDate, clientTimezone, format);
    console.log('🔧 date-fns-tz result:', result);
    
    return result;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Gets a safe timezone fallback
 * @param clientTimezone - Client's stored timezone
 * @returns Valid IANA timezone or browser/UTC fallback
 */
export const getSafeTimezone = (clientTimezone?: string | null): string => {
  if (clientTimezone) {
    try {
      // Test if timezone is valid by trying to use it
      formatInTimeZone(new Date(), clientTimezone, 'yyyy-MM-dd');
      return clientTimezone;
    } catch (error) {
      console.warn('Invalid client timezone:', clientTimezone);
    }
  }
  
  try {
    // Fallback to browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    // Final fallback to UTC
    return 'UTC';
  }
};

/**
 * Converts UTC timestamp to zoned time for calculations
 * @param utcTimestamp - ISO string timestamp in UTC
 * @param clientTimezone - IANA timezone identifier
 * @returns Date object in the client's timezone
 */
export const convertToClientZone = (
  utcTimestamp: string,
  clientTimezone: string
): Date => {
  const utcDate = parseISO(utcTimestamp);
  return toZonedTime(utcDate, clientTimezone);
};

/**
 * Common date format patterns for consistency
 */
export const DATE_FORMATS = {
  FULL_DATETIME: 'MM/dd/yyyy h:mm a',
  DATE_ONLY: 'MM/dd/yyyy',
  TIME_ONLY: 'h:mm a',
  LONG_DATE: 'EEEE, MMMM d, yyyy',
  SHORT_DATETIME: 'M/d/yy h:mm a'
} as const;
