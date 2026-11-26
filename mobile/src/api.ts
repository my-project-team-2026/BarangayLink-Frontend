import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { Announcement, DashboardSummary, DocumentRequest, ResidentRecord, User, UserProfile } from './types';

const TOKEN_KEY = 'barangaylink_mobile_token';
const USER_KEY = 'barangaylink_mobile_user';
const SERVER_KEY = 'barangaylink_mobile_server_url';

export function getDefaultApiUrl(): string {
  // If running via Expo Go on physical device or simulator, get host IP running Expo
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:3000/api/v1`;
    }
  }
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  return configured ? configured.replace(/\/$/, '') : 'http://localhost:3000/api/v1';
}

let cachedServerUrl: string | null = null;
let cachedToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export async function getServerUrl(): Promise<string> {
  if (cachedServerUrl) return cachedServerUrl;
  try {
    const saved = await AsyncStorage.getItem(SERVER_KEY);
    // If the saved URL is the stale emulator 10.0.2.2 address, auto-upgrade to real Wi-Fi IP
    if (saved && !saved.includes('10.0.2.2')) {
      cachedServerUrl = saved;
      return cachedServerUrl;
    }
    const defaultUrl = getDefaultApiUrl();
    cachedServerUrl = defaultUrl;
    return defaultUrl;
  } catch {
    return getDefaultApiUrl();
  }
}

export async function setServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/$/, '');
  cachedServerUrl = clean;
  await AsyncStorage.setItem(SERVER_KEY, clean);
}

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
    return cachedToken;
  } catch {
    return null;
  }
}

export async function saveSession(token: string, user: User): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<User | null> {
  try {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? (JSON.parse(data) as User) : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = await getServerUrl();
  const token = await getToken();

  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      `Cannot connect to backend server at ${baseUrl}. Ensure your PC backend is running and reachable over WiFi or emulator.`
    );
  }

  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {
    await clearSession();
    sessionExpiredHandler?.();
  }
  if (!response.ok || body?.success === false) {
    throw new ApiError(
      body?.message || body?.error || `Request failed (${response.status})`,
      response.status
    );
  }

  return body as T;
}

export const mobileApi = {
  // Auth
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; user: User & { name: string }; message: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  register: (data: Record<string, unknown>) =>
    request<{ success: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  profile: () => request<{ success: boolean; data: UserProfile }>('/auth/profile'),

  changePassword: (current_password: string, new_password: string) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Dashboard & Requests
  dashboard: () => request<{ success: boolean; data: DashboardSummary }>('/dashboard'),

  requests: () => request<{ success: boolean; data: DocumentRequest[] }>('/requests'),

  updateRequestStatus: (id:string,status:string,remarks:string) => request<{success:boolean;message:string}>(`/requests/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status,remarks})}),

  createRequest: (document_type: string, purpose: string) =>
    request<{ success: boolean; message: string; data: DocumentRequest }>('/requests', {
      method: 'POST',
      body: JSON.stringify({ document_type, purpose }),
    }),

  residents: (params: URLSearchParams) => request<{success:boolean;data:ResidentRecord[];pagination?:{total:number;totalPages:number;page:number;limit:number}}>(`/residents?${params.toString()}`),

  // Announcements
  announcements: (category?: string) =>
    request<{ success: boolean; data: Announcement[] }>(
      `/announcements${category ? `?category=${encodeURIComponent(category)}` : ''}`
    ),

  // Test server connectivity
  pingServer: async (customUrl?: string): Promise<boolean> => {
    const url = customUrl ? customUrl.trim().replace(/\/$/, '') : await getServerUrl();
    try {
      const res = await fetch(`${url}/dashboard`);
      return res.status === 200 || res.status === 401; // Reachable API
    } catch {
      return false;
    }
  },
};
