export type UserRole = 'Administrator' | 'Barangay Staff' | 'Resident'
export interface User {
  id: string; email: string; role: UserRole; resident_id?: string | null; name?: string
}
export interface Resident {
  id: string; first_name: string; middle_name?: string | null; last_name: string; suffix?: string | null;
  birthdate: string; age?: number; gender?: string; civil_status?: string; purok_zone: string;
  address_line: string; contact_number?: string | null; is_archived: boolean; created_at?: string
}
export interface DocumentRequest {
  id: string; tracking_number: string; resident_id: string; document_type: string; purpose: string;
  status: string; remarks?: string | null; first_name?: string; last_name?: string; purok_zone?: string;
  contact_number?: string; processor_email?: string; created_at: string
}
export interface DashboardSummary {
  total_residents?: number; total_households?: number; pending_requests?: number;
  residents_count?: number; households_count?: number; pending_requests_count?: number;
  [key: string]: unknown
}
export interface ApiResult<T> { success: boolean; data: T; count?: number; message?: string }
