/* eslint-disable @typescript-eslint/no-require-imports */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOUND_ASSETS = {
  clickA: require('../../../assets/Sounds/click-a.ogg'),
  clickB: require('../../../assets/Sounds/click-b.ogg'),
  switchA: require('../../../assets/Sounds/switch-a.ogg'),
  switchB: require('../../../assets/Sounds/switch-b.ogg'),
  tapA: require('../../../assets/Sounds/tap-a.ogg'),
  tapB: require('../../../assets/Sounds/tap-b.ogg'),
};

export type SoundId = keyof typeof SOUND_ASSETS;

class AudioManager {
  private loaded = new Map<SoundId, AudioPlayer>();
  private enabled = true;
  private modeConfigured = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async play(soundId: SoundId): Promise<void> {
    if (!this.enabled) return;

    await this.ensureMode();
    const player = this.load(soundId);

    try {
      await player.seekTo(0);
    } catch {
      // Ignore seek failures and still try playback.
    }

    player.play();
  }

  async disposeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.loaded.values()).map(async (player) => {
        try {
          player.pause();
          player.remove();
        } catch (err) {
          console.warn('[AudioManager] disposeAll: cleanup error', err);
        }
      })
    );
    this.loaded.clear();
  }

  private load(soundId: SoundId): AudioPlayer {
    const cached = this.loaded.get(soundId);
    if (cached) return cached;

    const player = createAudioPlayer(SOUND_ASSETS[soundId], {
      downloadFirst: true,
    });
    player.loop = false;
    this.loaded.set(soundId, player);
    return player;
  }

  private async ensureMode(): Promise<void> {
    if (this.modeConfigured) return;
    this.modeConfigured = true;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      });
    } catch {
      this.modeConfigured = false;
    }
  }
}

export const audioManager = new AudioManager();
