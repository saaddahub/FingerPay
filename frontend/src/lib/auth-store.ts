'use client';

import type { StaffRole } from '@fingerpay/contracts';

export interface StaffSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: StaffRole;
    institutionId: string | null;
    branchId: string | null;
    merchantId: string | null;
    aal: 1 | 2;
  };
}

let inMemorySession: StaffSession | null = null;
const listeners = new Set<() => void>();

export function getStaffSession(): StaffSession | null {
  return inMemorySession;
}

export function setStaffSession(session: StaffSession | null): void {
  inMemorySession = session;
  for (const fn of listeners) fn();
}

export function subscribeStaffSession(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (inMemorySession?.accessToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${inMemorySession.accessToken}`);
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  return fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  });
}
