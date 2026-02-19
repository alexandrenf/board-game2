import {
  AppSettings,
  GameProgress,
  PlayerProfile,
  ProfileRepository,
  ProgressRepository,
  SettingsRepository,
} from './types';

const PROFILE_KEY = 'boardgame/profile';
const PROGRESS_KEY = 'boardgame/progress';
const SETTINGS_KEY = 'boardgame/settings';

const memoryStorage = new Map<string, string>();

const getWebItem = async (key: string): Promise<string | null> => {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage.getItem(key);
  }

  return memoryStorage.has(key) ? memoryStorage.get(key) ?? null : null;
};

const setWebItem = async (key: string, value: string): Promise<void> => {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.setItem(key, value);
    return;
  }

  memoryStorage.set(key, value);
};

const removeWebItem = async (key: string): Promise<void> => {
  if (typeof globalThis.localStorage !== 'undefined') {
    globalThis.localStorage.removeItem(key);
    return;
  }

  memoryStorage.delete(key);
};

const parseStoredValue = <T>(raw: string | null): T | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export class KVProfileRepository implements ProfileRepository {
  async getProfile(): Promise<PlayerProfile | null> {
    const raw = await getWebItem(PROFILE_KEY);
    return parseStoredValue<PlayerProfile>(raw);
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    await setWebItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export class KVProgressRepository implements ProgressRepository {
  async getProgress(): Promise<GameProgress | null> {
    const raw = await getWebItem(PROGRESS_KEY);
    return parseStoredValue<GameProgress>(raw);
  }

  async saveProgress(progress: GameProgress): Promise<void> {
    await setWebItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  async clearProgress(): Promise<void> {
    await removeWebItem(PROGRESS_KEY);
  }
}

export class KVSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<AppSettings | null> {
    const raw = await getWebItem(SETTINGS_KEY);
    return parseStoredValue<AppSettings>(raw);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await setWebItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export const persistenceRepositories = {
  profile: new KVProfileRepository(),
  progress: new KVProgressRepository(),
  settings: new KVSettingsRepository(),
};
