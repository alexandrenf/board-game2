export type PlayerProfile = {
  id: string;
  displayName?: string;
  locale: string;
  avatar?: {
    shirtColor: string;
    hairColor: string;
    skinColor: string;
  };
};

export type GameProgress = {
  playerIndex: number;
  targetIndex: number;
  focusTileIndex: number;
  lastMessage: string | null;
  updatedAt: string;
};

export type AppSettings = {
  hapticsEnabled: boolean;
  audioEnabled: boolean;
  roamMode: boolean;
  zoomLevel: number;
  renderQuality: 'low' | 'medium' | 'high';
};

export interface ProfileRepository {
  getProfile(): Promise<PlayerProfile | null>;
  saveProfile(profile: PlayerProfile): Promise<void>;
}

export interface ProgressRepository {
  getProgress(): Promise<GameProgress | null>;
  saveProgress(progress: GameProgress): Promise<void>;
  clearProgress(): Promise<void>;
}

export interface SettingsRepository {
  getSettings(): Promise<AppSettings | null>;
  saveSettings(settings: AppSettings): Promise<void>;
}
