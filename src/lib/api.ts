import { auth } from './firebase-auth';

export async function getAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken().catch(() => null);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = await getAuthHeaders(options.headers as Record<string, string> | undefined);
  return fetch(url, { ...options, headers });
}
