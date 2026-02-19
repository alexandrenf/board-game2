import { nanoid } from '@/src/utils/nanoid';
import {
  AuthGateway,
  ProgressGateway,
  SyncEnvelope,
  TelemetryGateway,
} from './types';
import { GameProgress } from '@/src/services/persistence/types';

const inMemoryProgressStore: { latest: SyncEnvelope<GameProgress> | null } = {
  latest: null,
};

export class AnonymousAuthGateway implements AuthGateway {
  private cachedDeviceId: string | null = null;

  async getDeviceIdentity(): Promise<{ deviceId: string }> {
    if (!this.cachedDeviceId) {
      this.cachedDeviceId = `anon-${nanoid(12)}`;
    }

    return { deviceId: this.cachedDeviceId };
  }
}

export class LocalProgressGateway implements ProgressGateway {
  async pushProgress(payload: SyncEnvelope<GameProgress>): Promise<void> {
    const current = inMemoryProgressStore.latest;
    if (!current) {
      inMemoryProgressStore.latest = payload;
      return;
    }

    const incomingDate = new Date(payload.timestamp).getTime();
    const currentDate = new Date(current.timestamp).getTime();

    if (incomingDate >= currentDate) {
      inMemoryProgressStore.latest = payload;
    }
  }

  async pullProgress(): Promise<SyncEnvelope<GameProgress> | null> {
    return inMemoryProgressStore.latest;
  }
}

export class NoopTelemetryGateway implements TelemetryGateway {
  async track(_event: string, _payload?: Record<string, unknown>): Promise<void> {
    return Promise.resolve();
  }
}

export const defaultSyncAdapters = {
  auth: new AnonymousAuthGateway(),
  progress: new LocalProgressGateway(),
  telemetry: new NoopTelemetryGateway(),
};
