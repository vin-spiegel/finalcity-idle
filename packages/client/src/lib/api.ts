type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export type ZoneRow = {
  id:          string;
  parentId:    string | null;
  name:        string;
  desc:        string;
  art:         string;
  levelReq:    number;
  dangerLevel: string;
  // leaf-only (null for branch nodes):
  tickSec:     number | null;
  jobType:     string | null;
};

export type UserRow = { id: number; username: string; level: number };

export type SyncResult = {
  ticks:            number;
  progress:         number;
  isFarming:        boolean;
  resources:        Record<string, number>;
  jobPointsGained:  number;
  tickSec:          number;
  nextTickIn:       number;
};

export type ExplorationStatus = {
  zoneId:     string;
  progress:   number;
  isFarming:  boolean;
  tickSec:    number;
  nextTickIn: number;
} | null;

export const api = {
  fetchZones: () =>
    req<ZoneRow[]>('/zones'),

  getMe: () =>
    req<UserRow>('/user/me'),

  getResources: () =>
    req<Record<string, number>>('/user/me/resources'),

  startExploration: (zoneId: string) =>
    req<{ zoneId: string; startedAt: string }>('/exploration/start', {
      method: 'POST',
      body: JSON.stringify({ zoneId }),
    }),

  syncExploration: () =>
    req<SyncResult>('/exploration/sync', { method: 'POST', body: '{}' }),

  stopExploration: () =>
    req<null>('/exploration/stop', { method: 'POST', body: '{}' }),

  getStatus: () =>
    req<ExplorationStatus>('/exploration/status'),
};
