
/**
 * Represents an availability block for a clinician in the UTC-only data model.
 * This type matches the schema of the availability_blocks table.
 */
export interface AvailabilityBlock {
  id: string;
  clinician_id: string; // UUID of the clinician
  start_at: string;     // UTC ISO string
  end_at: string;       // UTC ISO string
  is_active: boolean;   // Whether this availability block is currently active
  created_at?: string;  // UTC ISO string of when the record was created
  
  /**
   * Defines the recurring pattern for this availability block.
   * Structure: {
   *   frequency: 'weekly' | 'biweekly' | 'monthly',
   *   days: string[],     // Array of days of the week (e.g., ['Monday', 'Wednesday'])
   *   end_date?: string,  // Optional end date for the recurring pattern
   *   exceptions?: string[] // Optional array of dates to exclude
   * }
   */
  recurring_pattern?: {
    frequency: string;
    days: string[];
    end_date?: string;
    exceptions?: string[];
  } | null;
}
