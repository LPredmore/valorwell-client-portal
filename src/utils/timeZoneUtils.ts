import { TimeZoneService } from './timeZoneService';
import { timezoneOptions } from './timezoneOptions';

/**
 * Get the user's timezone from the browser
 */
export function getUserTimeZone(): string {
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Make sure the timezone is in our allowed list (from the enum)
    const isValidTimezone = timezoneOptions.some(tz => tz.value === browserTimezone);
    
    if (isValidTimezone) {
      return TimeZoneService.ensureIANATimeZone(browserTimezone);
    } else {
      // Default to Eastern Time if not in allowed list
      return TimeZoneService.DEFAULT_TIMEZONE;
    }
  } catch (error) {
    console.error('Error getting user timezone:', error);
    return TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Format a date object to a 12-hour time string (e.g. "9:00 AM")
 */
export function formatDateToTime12Hour(date: Date): string {
  try {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid time';
    }
    return TimeZoneService.formatTime(TimeZoneService.fromJSDate(date));
  } catch (error) {
    console.error('Error formatting date to 12-hour time:', error);
    return date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Invalid time';
  }
}

/**
 * Format a time string to a 12-hour time string (e.g. "09:00" -> "9:00 AM")
 */
export function formatTimeStringTo12Hour(timeString: string): string {
  try {
    if (!timeString) {
      return '';
    }
    const dt = TimeZoneService.fromTimeString(timeString);
    return TimeZoneService.formatTime(dt);
  } catch (error) {
    console.error('Error formatting time string:', error);
    return timeString || 'Invalid time'; // Return the original string if parsing fails
  }
}

/**
 * Format a time string in the user's timezone
 * @param timeString Time string in format "HH:MM"
 * @param userTimeZone IANA timezone string
 * @param formatStr Format string for the output
 * @param dateStr Optional date string in format "yyyy-MM-dd" to use instead of today's date
 */
export function formatTimeInUserTimeZone(
  timeString: string, 
  userTimeZone: string, 
  formatStr: string = TimeZoneService.TIME_FORMAT_AMPM,
  dateStr?: string
): string {
  try {
    if (!timeString) {
      return 'Time unavailable';
    }
    
    // Ensure we have a valid timezone
    const safeTimezone = TimeZoneService.ensureIANATimeZone(userTimeZone);
    
    // If dateStr is provided, use it, otherwise get today's date
    const baseDate = dateStr 
      ? TimeZoneService.fromDateString(dateStr, safeTimezone)
      : TimeZoneService.today(safeTimezone);
    const baseDateStr = TimeZoneService.formatDate(baseDate);
    
    // Use TimeZoneService to create and format the datetime
    const dateTime = TimeZoneService.createDateTime(baseDateStr, timeString, safeTimezone);
    return TimeZoneService.formatDateTime(dateTime, formatStr);
  } catch (error) {
    console.error('Error formatting time in user timezone:', error);
    // Fallback to simple formatting
    return timeString || 'Time unavailable';
  }
}

/**
 * Format timezone for display (e.g. "EDT" or "America/New_York")
 */
export function formatTimeZoneDisplay(timezone: string): string {
  try {
    const safeTimezone = TimeZoneService.ensureIANATimeZone(timezone);
    
    const now = TimeZoneService.now(safeTimezone);
    if (!now.isValid) {
      console.error('Invalid DateTime for timezone display', now.invalidReason, now.invalidExplanation);
      return safeTimezone;
    }
    return now.toFormat('ZZZZ'); // Returns the timezone abbreviation (e.g., EDT)
  } catch (error) {
    console.error('Error formatting timezone display:', error);
    return timezone || TimeZoneService.DEFAULT_TIMEZONE;
  }
}

/**
 * Convert a date and time string to a specific timezone
 */
export function convertToTimezone(dateStr: string, timeStr: string, timezone: string) {
  try {
    return TimeZoneService.createDateTime(dateStr, timeStr, timezone);
  } catch (error) {
    console.error('Error converting to timezone:', error);
    return TimeZoneService.now(timezone);
  }
}

/**
 * Format a date to display with timezone abbreviation (e.g. "Mar 12, 2023 - CST")
 */
export function formatDateWithTimezone(date: Date, timezone: string): string {
  try {
    const dt = TimeZoneService.fromJSDate(date, timezone);
    return TimeZoneService.formatDateTime(dt, 'MMM d, yyyy - ZZZZ');
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return date.toLocaleDateString();
  }
}

/**
 * Format a date with timezone (e.g. "Mar 12, 2023 at 3:30 PM EDT")
 */
export function formatWithTimeZone(date: Date, timezone: string, formatStr: string = 'MMM d, yyyy \'at\' h:mm a ZZZZ'): string {
  try {
    const dt = TimeZoneService.fromJSDate(date, timezone);
    return TimeZoneService.formatDateTime(dt, formatStr);
  } catch (error) {
    console.error('Error formatting date with timezone:', error);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

/**
 * Ensures a timezone string is a valid IANA timezone from our allowed enum values
 */
export function ensureIANATimeZone(timezone: string | null | undefined): string {
  if (!timezone) return TimeZoneService.DEFAULT_TIMEZONE;
  
  // Check if timezone is in our allowed list from the enum
  const isValidTimezone = timezoneOptions.some(tz => tz.value === timezone);
  
  return isValidTimezone ? timezone : TimeZoneService.DEFAULT_TIMEZONE;
}

/**
 * Format a time value to 12-hour format
 */
export function formatTime12Hour(timeString: string): string {
  if (!timeString) return 'Time unavailable';
  
  try {
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const dt = TimeZoneService.fromTimeString(timeString);
    return TimeZoneService.formatTime(dt);
  } catch (error) {
    console.error('Error formatting to 12-hour time:', error);
    return timeString || 'Time unavailable';
  }
}

/**
 * Get a user-friendly display name for a timezone
 */
export function getTimeZoneDisplayName(timezone: string): string {
  return TimeZoneService.getTimeZoneDisplayName(timezone);
}
