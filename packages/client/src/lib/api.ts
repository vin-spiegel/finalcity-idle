type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
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

  createUser: (username: string) =>
    req<UserRow>('/user', { method: 'POST', body: JSON.stringify({ username }) }),

  startExploration: (userId: number, sectorId: string) =>
    req<{ sectorId: string; startedAt: string }>('/exploration/start', {
      method: 'POST',
      body: JSON.stringify({ userId, sectorId }),
    }),

  syncExploration: (userId: number) =>
    req<SyncResult>('/exploration/sync', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  getStatus: (userId: number) =>
    req<ExplorationStatus>(`/exploration/status?userId=${userId}`),
};
