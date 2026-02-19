/* global jest */
const mockMemoryStore = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  Storage: {
    async getItem(key: string) {
      return mockMemoryStore.has(key) ? mockMemoryStore.get(key) ?? null : null;
    },
    async setItem(key: string, value: string) {
      mockMemoryStore.set(key, value);
    },
    async removeItem(key: string) {
      mockMemoryStore.delete(key);
    },
    async clear() {
      mockMemoryStore.clear();
    },
  },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('@/src/services/audio/audioManager', () => ({
  audioManager: {
    setEnabled: jest.fn(),
    play: jest.fn().mockResolvedValue(undefined),
    disposeAll: jest.fn().mockResolvedValue(undefined),
  },
}));
