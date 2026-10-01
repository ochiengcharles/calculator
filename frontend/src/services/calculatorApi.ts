import type { AngleMode, CalculationResponse, HistoryEntry } from '../types';

const DEFAULT_API_BASE = 'http://localhost:5000/api';
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_BASE;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const result = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const errorText = result?.error || result?.message || 'Request failed';
    throw new Error(errorText);
  }

  return result as T;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>('/health');
    return Boolean(data?.status === 'ok');
  } catch {
    return false;
  }
}

export async function calculateExpression(expression: string, angleMode: AngleMode): Promise<CalculationResponse> {
  return request<CalculationResponse>('/calculate', {
    method: 'POST',
    body: JSON.stringify({ expression, angle_mode: angleMode }),
  });
}

export async function getHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>('/history');
}

export async function deleteHistoryItem(id: number | string): Promise<void> {
  await request(`/history/${id}`, { method: 'DELETE' });
}

export async function clearHistory(): Promise<void> {
  await request('/history', { method: 'DELETE' });
}
