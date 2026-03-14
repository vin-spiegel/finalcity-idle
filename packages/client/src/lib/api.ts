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

export type SectorRow = {
  id:          string;
  zoneId:      string;
  regionKey:   string;
  name:        string;
  levelReq:    number;
  tickSec:     number;
  dangerLevel: string;
  jobType:     string;
  art:         string;
  desc:        string;
};

export type UserRow = { id: number; username: string; level: number };

export type SyncResult = {
  ticks:            number;
  progress:         number;
  isFarming:        boolean;
  resources:        Record<string, number>;
  jobPointsGained:  number;
  nextTickIn:       number;
};

export type ExplorationStatus = {
  sectorId:   string;
  progress:   number;
  isFarming:  boolean;
  nextTickIn: number;
} | null;

export const api = {
  fetchSectors: () =>
    req<SectorRow[]>('/zones/sectors'),

  getMe: () =>
    req<UserRow>('/user/me'),

  getResources: () =>
    req<Record<string, number>>('/user/me/resources'),

  startExploration: (sectorId: string) =>
    req<{ sectorId: string; startedAt: string }>('/exploration/start', {
      method: 'POST',
      body: JSON.stringify({ sectorId }),
    }),

  syncExploration: () =>
    req<SyncResult>('/exploration/sync', { method: 'POST', body: '{}' }),

  stopExploration: () =>
    req<null>('/exploration/stop', { method: 'POST', body: '{}' }),

  getStatus: () =>
    req<ExplorationStatus>('/exploration/status'),
};
