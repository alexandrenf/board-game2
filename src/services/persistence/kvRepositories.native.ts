import { Storage } from 'expo-sqlite/kv-store';
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
    const raw = await Storage.getItem(PROFILE_KEY);
    return parseStoredValue<PlayerProfile>(raw);
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    await Storage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export class KVProgressRepository implements ProgressRepository {
  async getProgress(): Promise<GameProgress | null> {
    const raw = await Storage.getItem(PROGRESS_KEY);
    return parseStoredValue<GameProgress>(raw);
  }

  async saveProgress(progress: GameProgress): Promise<void> {
    await Storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  async clearProgress(): Promise<void> {
    await Storage.removeItem(PROGRESS_KEY);
  }
}

export class KVSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<AppSettings | null> {
    const raw = await Storage.getItem(SETTINGS_KEY);
    return parseStoredValue<AppSettings>(raw);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export const persistenceRepositories = {
  profile: new KVProfileRepository(),
  progress: new KVProgressRepository(),
  settings: new KVSettingsRepository(),
};
