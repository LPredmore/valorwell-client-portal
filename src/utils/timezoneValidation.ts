
import { DateTime } from 'luxon';

/**
 * Validates if a timezone string is a valid IANA timezone identifier
 */
export const isValidIANATimezone = (timezone: string): boolean => {
  try {
    // Use Luxon to validate the timezone
    DateTime.now().setZone(timezone);
    return DateTime.local().setZone(timezone).isValid;
  } catch (error) {
    return false;
  }
};

/**
 * Gets the effective timezone for a client, prioritizing their stored timezone
 */
export const getEffectiveClientTimezone = (
  clientTimezone: string | null | undefined,
  fallbackTimezone?: string
): string => {
  // First priority: client's stored timezone if valid
  if (clientTimezone && isValidIANATimezone(clientTimezone)) {
    return clientTimezone;
  }
  
  // Second priority: provided fallback if valid
  if (fallbackTimezone && isValidIANATimezone(fallbackTimezone)) {
    return fallbackTimezone;
  }
  
  // Third priority: try to get browser timezone
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidIANATimezone(browserTimezone)) {
      return browserTimezone;
    }
  } catch (error) {
    console.warn('Could not detect browser timezone:', error);
  }
  
  // Final fallback: Eastern Time (most common for veterans)
  return 'America/New_York';
};

/**
 * Converts availability times from clinician timezone to client timezone
 */
export const convertAvailabilityTime = (
  timeString: string,
  fromTimezone: string,
  toTimezone: string,
  date?: Date
): { time: string; formattedTime: string } => {
  try {
    const [hour, minute] = timeString.split(':').map(Number);
    const baseDate = date || new Date();
    
    // Create a DateTime in the clinician's timezone
    const clinicianTime = DateTime.fromObject(
      {
        year: baseDate.getFullYear(),
        month: baseDate.getMonth() + 1,
        day: baseDate.getDate(),
        hour,
        minute
      },
      { zone: fromTimezone }
    );
    
    // Convert to client's timezone
    const clientTime = clinicianTime.setZone(toTimezone);
    
    return {
      time: clientTime.toFormat('HH:mm'),
      formattedTime: clientTime.toFormat('h:mm a')
    };
  } catch (error) {
    console.error('Error converting availability time:', error);
    return {
      time: timeString,
      formattedTime: timeString
    };
  }
};
