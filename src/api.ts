import type { ApiResult, DashboardSummary, DocumentRequest, Resident, User } from './types'

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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try { response = await fetch(`${API_BASE}${path}`, { ...options, headers }) }
  catch { throw new ApiError(`Cannot reach the API at ${API_BASE}. Start the backend and check the API URL.`) }
  const body = await response.json().catch(() => ({}))
  if (!response.ok || body?.success === false) {
    throw new ApiError(body?.message || body?.error || `Request failed (${response.status})`, response.status)
  }
  return body as T
}
export const api = {
  login: (email: string, password: string) => request<{ success: boolean; token: string; user: User & { name: string }; message: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: Record<string, unknown>) => request<{ success: boolean; message: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  dashboard: () => request<ApiResult<DashboardSummary>>('/dashboard'),
  residents: (params: URLSearchParams) => request<ApiResult<Resident[]>>(`/residents${params.size ? `?${params.toString()}` : ''}`),
  resident: (id: string) => request<ApiResult<Resident>>(`/residents/${encodeURIComponent(id)}`),
  requests: () => request<ApiResult<DocumentRequest[]>>('/requests'),
  createRequest: (document_type: string, purpose: string) => request<{ success: boolean; message: string; data: DocumentRequest }>('/requests', { method: 'POST', body: JSON.stringify({ document_type, purpose }) }),
  updateRequestStatus: (id: string, status: string, remarks: string) => request<{ success: boolean; message: string }>(`/requests/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status, remarks }) })
}
export const apiBase = API_BASE
