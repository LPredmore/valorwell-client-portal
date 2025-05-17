
/**
 * Unified Appointment interface for all components.
 * UTC timestamps (start_at, end_at) are the sole source of truth for appointment timing.
 * This interface represents a processed appointment object ready for use in the application.
 *
 * Note: Legacy date, start_time, and end_time columns have been removed from the database
 * as per migration 20250506_drop_legacy_appointment_columns.sql
 */
export interface Appointment {
  id: string;
  client_id: string;      // Foreign key to clients table
  clinician_id: string;   // Foreign key to clinicians table
  start_at: string;       // UTC ISO timestamp string (e.g., "2025-05-07T14:00:00.000Z") - NOT NULL
  end_at: string;         // UTC ISO timestamp string (e.g., "2025-05-07T15:00:00.000Z") - NOT NULL
  type: string;           // Appointment type (e.g., "initial", "follow-up")
  status: string;         // Appointment status (e.g., "scheduled", "completed", "cancelled")
  video_room_url?: string | null;  // URL for video appointments
  notes?: string | null;  // Notes about the appointment
  created_at?: string;    // UTC ISO timestamp of when the record was created
  updated_at?: string;    // UTC ISO timestamp of when the record was last updated
  appointment_recurring?: string | null;  // Information about recurrence
  recurring_group_id?: string | null;     // ID grouping recurring appointments
  session_did_not_occur?: boolean | null; // Flag indicating if session didn't happen
  session_did_not_occur_reason?: string | null; // Reason why session didn't occur
  
  // Client information, structured as an object.
  // This is populated by useAppointments.tsx from the Supabase 'clients' join.
  client?: {
    client_first_name: string; // Should not be null after processing in useAppointments (uses || '')
    client_last_name: string;  // Should not be null after processing
    client_preferred_name: string; // Should not be null after processing
  };
  
  // Convenience field, populated by useAppointments.tsx
  // CONSISTENT FORMAT: Always uses "client_preferred_name client_last_name" when both exist
  // Falls back to "client_first_name client_last_name"
  clientName?: string;
}
