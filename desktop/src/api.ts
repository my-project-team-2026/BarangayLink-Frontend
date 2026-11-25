import type {
  Announcement, AnnouncementInput, ApiResult, DashboardSummary,
  DemographicReport, DocumentRequest, Household, HouseholdDetail, Resident, User, UserProfile
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '')
export const TOKEN_KEY = 'barangaylink_token'
export const USER_KEY = 'barangaylink_user'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) { super(message); this.status = status }
}
export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export function getSavedUser(): User | null {
  try { const value = localStorage.getItem(USER_KEY); return value ? JSON.parse(value) as User : null } catch { return null }
}
export function clearSession() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY) }

export async function pingApiHealth(): Promise<boolean> {
  const healthUrl = `${API_BASE.replace(/\/api\/v1\/?$/, '')}/api/health`
  try { const response = await fetch(healthUrl, { method: 'GET' }); return response.ok } catch { return false }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers }) }
  catch { throw new ApiError(`Cannot reach the API at ${API_BASE}. Start the backend and check the API URL.`) }
  const body = await response.json().catch(() => ({}))
  if (response.status === 401 && token) {
    clearSession()
    window.dispatchEvent(new Event('barangaylink:session-expired'))
  }
  if (!response.ok || body?.success === false) {
    throw new ApiError(body?.message || body?.error || `Request failed (${response.status})`, response.status)
  }
  return body as T
}
export const api = {
  adminUsers: () => request<ApiResult<Array<{id:string;email:string;role:string;is_active:boolean;created_at:string}>>>('/admin/users'),
  createAdminUser: (email:string,password:string,role:string) => request<{success:boolean;data:unknown}>('/admin/users',{method:'POST',body:JSON.stringify({email,password,role})}),
  updateAdminUser: (id:string,role:string,is_active:boolean) => request<{success:boolean;data:unknown}>(`/admin/users/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({role,is_active})}),
  auditLogs: () => request<ApiResult<Array<{id:string;table_name:string;record_id:string;action:string;performed_by:string;old_data:unknown;new_data:unknown;timestamp:string}>>>('/admin/audit-logs'),
  login: (email: string, password: string) => request<{ success: boolean; token: string; user: User & { name: string }; message: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: Record<string, unknown>) => request<{ success: boolean; message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  profile: () => request<ApiResult<UserProfile>>('/auth/profile'),
  changePassword: (current_password: string, new_password: string) => request<{ success: boolean; message: string }>('/auth/change-password', { method: 'PUT', body: JSON.stringify({ current_password, new_password }) }),
  dashboard: () => request<ApiResult<DashboardSummary>>('/dashboard'),
  residents: (params: URLSearchParams) => request<ApiResult<Resident[]> & { pagination?: { total:number; page:number; limit:number; totalPages:number } }>(`/residents${params.size ? `?${params.toString()}` : ''}`),
  createResident: (data: Partial<Resident>) => request<{success:boolean;message:string;data:{id:string}}>('/residents',{method:'POST',body:JSON.stringify(data)}),
  updateResident: (id:string,data:Partial<Resident>) => request<{success:boolean;message:string}>(`/residents/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(data)}),
  archiveResident: (id:string,is_archived:boolean) => request<{success:boolean;message:string}>(`/residents/${encodeURIComponent(id)}/archive`,{method:'PATCH',body:JSON.stringify({is_archived})}),
  resident: (id: string) => request<ApiResult<Resident>>(`/residents/${encodeURIComponent(id)}`),
  requests: () => request<ApiResult<DocumentRequest[]>>('/requests'),
  createRequest: (document_type: string, purpose: string) => request<{ success: boolean; message: string; data: DocumentRequest }>('/requests', { method: 'POST', body: JSON.stringify({ document_type, purpose }) }),
  updateRequestStatus: (id: string, status: string, remarks: string) => request<{ success: boolean; message: string }>(`/requests/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) }),
  households: (params: URLSearchParams) => request<ApiResult<Household[]>>(`/households${params.size ? `?${params.toString()}` : ''}`),
  household: (id: string) => request<ApiResult<HouseholdDetail>>(`/households/${encodeURIComponent(id)}`),
  updateHousehold: (id:string,data: {household_number:string;purok_zone:string;street_address:string;head_resident_id?:string|null}) => request<{success:boolean;message:string}>(`/households/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify(data)}),
  deleteHousehold: (id:string) => request<{success:boolean;message:string}>(`/households/${encodeURIComponent(id)}`,{method:'DELETE'}),
  createHousehold: (data: { household_number: string; purok_zone: string; street_address: string; head_resident_id?: string | null }) => request<{ success: boolean; message: string; data: { id: string } }>('/households', { method: 'POST', body: JSON.stringify(data) }),
  assignHouseholdMember: (id: string, resident_id: string, relationship_to_head: string) => request<{ success: boolean; message: string }>(`/households/${encodeURIComponent(id)}/members`, { method: 'POST', body: JSON.stringify({ resident_id, relationship_to_head }) }),
  removeHouseholdMember: (id: string, residentId: string) => request<{ success: boolean; message: string }>(`/households/${encodeURIComponent(id)}/members/${encodeURIComponent(residentId)}`, { method: 'DELETE' }),
  announcements: (category?: string) => request<ApiResult<Announcement[]>>(`/announcements${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  createAnnouncement: (data: AnnouncementInput) => request<{ success: boolean; message: string }>('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id: string, data: AnnouncementInput) => request<{ success: boolean; message: string }>(`/announcements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAnnouncement: (id: string) => request<{ success: boolean; message: string }>(`/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  demographicsReport: () => request<ApiResult<DemographicReport>>('/reports/demographics')
}
export const apiBase = API_BASE
