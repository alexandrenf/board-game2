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
    try {
      const raw = await Storage.getItem(PROFILE_KEY);
      return parseStoredValue<PlayerProfile>(raw);
    } catch (err) {
      console.warn('KVProfileRepository.getProfile failed', err);
      return null;
    }
  }

  async saveProfile(profile: PlayerProfile): Promise<void> {
    try {
      await Storage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('KVProfileRepository.saveProfile failed', err);
    }
  }
}

export class KVProgressRepository implements ProgressRepository {
  async getProgress(): Promise<GameProgress | null> {
    try {
      const raw = await Storage.getItem(PROGRESS_KEY);
      return parseStoredValue<GameProgress>(raw);
    } catch (err) {
      console.warn('KVProgressRepository.getProgress failed', err);
      return null;
    }
  }

  async saveProgress(progress: GameProgress): Promise<void> {
    try {
      await Storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('KVProgressRepository.saveProgress failed', err);
    }
  }

  async clearProgress(): Promise<void> {
    try {
      await Storage.removeItem(PROGRESS_KEY);
    } catch (err) {
      console.warn('KVProgressRepository.clearProgress failed', err);
    }
  }
}

export class KVSettingsRepository implements SettingsRepository {
  async getSettings(): Promise<AppSettings | null> {
    try {
      const raw = await Storage.getItem(SETTINGS_KEY);
      return parseStoredValue<AppSettings>(raw);
    } catch (err) {
      console.warn('KVSettingsRepository.getSettings failed', err);
      return null;
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('KVSettingsRepository.saveSettings failed', err);
    }
  }
}

export const persistenceRepositories = {
  profile: new KVProfileRepository(),
  progress: new KVProgressRepository(),
  settings: new KVSettingsRepository(),
};
