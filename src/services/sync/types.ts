import { AppSettings, GameProgress, PlayerProfile } from '@/src/services/persistence/types';

export type SyncEnvelope<TPayload> = {
  version: 1;
  timestamp: string;
  payload: TPayload;
};

export interface AuthGateway {
  getDeviceIdentity(): Promise<{ deviceId: string }>;
}

export interface ProgressGateway {
  pushProgress(payload: SyncEnvelope<GameProgress>): Promise<void>;
  pullProgress(): Promise<SyncEnvelope<GameProgress> | null>;
}

export interface TelemetryGateway {
  track(event: string, payload?: Record<string, unknown>): Promise<void>;
}

type SyncQueueBase = {
  id: string;
  createdAt: string;
};

export type SyncQueueItem =
  | (SyncQueueBase & { type: 'progress'; payload: GameProgress })
  | (SyncQueueBase & { type: 'settings'; payload: AppSettings })
  | (SyncQueueBase & { type: 'profile'; payload: PlayerProfile });

export type SyncConflictStrategy = 'server_wins_timestamp';
