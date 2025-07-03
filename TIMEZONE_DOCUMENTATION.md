
# Timezone Implementation Documentation

## Overview

This application implements comprehensive client-side timezone conversion to ensure all veterans see appointment times in their local timezone, regardless of where clinicians or the system are located.

## Dependencies

The timezone functionality relies on:
- `date-fns` - Core date manipulation utilities
- `date-fns-tz` - Timezone-aware date formatting and conversion

```bash
npm install date-fns date-fns-tz
```

## Architecture

### Database Storage
- All appointment times are stored as UTC timestamps in the database
- Client timezones are stored as IANA timezone identifiers (e.g., "America/Chicago")
- Fallback logic ensures valid timezones even when client data is missing

### Client-Side Conversion
All date/time displays in the client portal use the `src/utils/dateFormatting.ts` utility module:

```typescript
import { formatInClientTimezone } from '@/utils/dateFormatting';

// Convert UTC timestamp to client's timezone
const displayTime = formatInClientTimezone(
  appointment.start_at,    // UTC timestamp from database
  clientTimezone,          // Client's IANA timezone
  'MM/dd/yyyy h:mm a'     // Display format
);
```

## Key Functions

### formatInClientTimezone()
Converts UTC timestamps to formatted strings in the client's timezone:
```typescript
formatInClientTimezone(
  utcTimestamp: string,
  clientTimezone: string,
  format?: string
) => string
```

### getSafeTimezone()
Provides timezone fallback logic:
1. Use client's stored timezone if valid
2. Fall back to browser timezone
3. Final fallback to UTC

### convertToClientZone()
Converts UTC timestamp to Date object in client's timezone for calculations:
```typescript
convertToClientZone(
  utcTimestamp: string,
  clientTimezone: string
) => Date
```

## Usage Patterns

### Appointment Display
```typescript
const MyAppointments = ({ clientData }) => {
  const clientTimezone = getSafeTimezone(clientData?.client_time_zone);
  
  const formatAppointment = (appointment) => ({
    ...appointment,
    displayDate: formatInClientTimezone(
      appointment.start_at,
      clientTimezone,
      DATE_FORMATS.DATE_ONLY
    ),
    displayTime: formatInClientTimezone(
      appointment.start_at,
      clientTimezone,
      DATE_FORMATS.TIME_ONLY
    )
  });
};
```

### Profile Timezone Selection
The client profile includes a timezone selector that:
- Displays user-friendly labels (e.g., "Eastern Time")
- Saves IANA identifiers to database (e.g., "America/New_York")
- Updates all appointment displays when changed

## Format Constants

Standard formats are defined in `DATE_FORMATS`:
- `FULL_DATETIME`: "MM/dd/yyyy h:mm a"
- `DATE_ONLY`: "MM/dd/yyyy"
- `TIME_ONLY`: "h:mm a"
- `LONG_DATE`: "EEEE, MMMM d, yyyy"

## Components Updated

The following components now use proper timezone conversion:
- `AppointmentCard` - Individual appointment display
- `MyAppointments` - Past appointments table
- `MyPortal` - Today's and upcoming appointments
- `AppointmentBookingDialog` - Booking interface
- `EditAppointmentDialog` - Appointment editing

## Testing

Test timezone functionality with these scenarios:
1. Client in Eastern timezone booking with Pacific clinician
2. Daylight Saving Time transitions
3. Invalid/missing timezone data (fallback behavior)
4. Cross-timezone appointment modifications

## Migration Notes

When updating existing components:
1. Replace direct `Date` usage with `formatInClientTimezone()`
2. Fetch client timezone from database
3. Use `getSafeTimezone()` for fallback handling
4. Apply consistent format patterns from `DATE_FORMATS`

## Performance Considerations

- Client timezone is memoized to prevent repeated calculations
- Database queries use React Query for caching
- Timezone conversion is done at display time, not storage time
- Large appointment lists include pagination to prevent performance issues

## Error Handling

The system gracefully handles:
- Invalid timezone identifiers
- Missing client timezone data
- Malformed UTC timestamps
- Network failures when fetching client data

All errors are logged and fallback to safe defaults to prevent application crashes.
