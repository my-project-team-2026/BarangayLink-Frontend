export type UserRole = 'Administrator' | 'Barangay Staff' | 'Resident'
export interface User {
  id: string; email: string; role: UserRole; resident_id?: string | null; name?: string
}
export interface UserProfile {
  id: string; email: string; role: UserRole; is_active: boolean; created_at?: string;
  resident_id?: string | null; first_name?: string | null; middle_name?: string | null;
  last_name?: string | null; suffix?: string | null; birthdate?: string | null;
  gender?: string | null; civil_status?: string | null; purok_zone?: string | null;
  address_line?: string | null; contact_number?: string | null;
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
export interface ApiResult<T> { success: boolean; data: T; count?: number; message?: string; pagination?: { total:number; page:number; limit:number; totalPages:number } }

export interface Household {
  id: string; household_number: string; purok_zone: string; street_address: string;
  head_resident_id?: string | null; head_name?: string | null; member_count?: number | string;
  created_at?: string; updated_at?: string
}
export interface HouseholdMember {
  member_id: string; resident_id: string; first_name: string; last_name: string;
  age?: number | null; gender?: string | null; relationship_to_head: string; contact_number?: string | null
}
export interface HouseholdDetail extends Household { members: HouseholdMember[] }
export interface Announcement {
  id: string; title: string; content: string; category: string; is_pinned: boolean;
  published_by?: string | null; publisher_name?: string | null; created_at: string; updated_at?: string
}
export interface AnnouncementInput { title: string; content: string; category: string; is_pinned: boolean }
export interface DemographicReport {
  total_population: number | string; male_count: number | string; female_count: number | string;
  children_count: number | string; adult_count: number | string; senior_count: number | string;
  total_households: number | string
}
