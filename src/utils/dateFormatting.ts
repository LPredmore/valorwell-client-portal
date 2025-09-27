
import { parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Utility functions for consistent date/time formatting across the application
 */

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
    // Debug the conversion process
    console.log('🔧 formatInClientTimezone Debug:', {
      input: utcTimestamp,
      timezone: clientTimezone,
      format
    });
    
    // Handle timezone-aware ISO strings by treating them as UTC
    let cleanUtcString = utcTimestamp;
    if (utcTimestamp.includes('+') || utcTimestamp.endsWith('Z')) {
      // Strip timezone info and ensure it's treated as UTC
      cleanUtcString = utcTimestamp.replace(/[+-]\d{2}:\d{2}$|Z$/, '') + 'Z';
    }
    
    console.log('🔧 Cleaned UTC string:', cleanUtcString);
    
    const utcDate = parseISO(cleanUtcString);
    console.log('🔧 Parsed UTC date:', utcDate.toISOString());
    
    const result = formatInTimeZone(utcDate, clientTimezone, format);
    console.log('🔧 Final result:', result);
    
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
