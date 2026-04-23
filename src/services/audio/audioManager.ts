/* eslint-disable @typescript-eslint/no-require-imports */
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SFX_ASSETS = {
  'ui.click_a': require('../../../assets/Sounds/click-a.ogg'),
  'ui.click_b': require('../../../assets/Sounds/click-b.ogg'),
  'ui.switch_a': require('../../../assets/Sounds/switch-a.ogg'),
  'ui.switch_b': require('../../../assets/Sounds/switch-b.ogg'),
  'ui.tap_a': require('../../../assets/Sounds/tap-a.ogg'),
  'ui.tap_b': require('../../../assets/Sounds/tap-b.ogg'),
  'sfx.dice_roll': require('../../../assets/Sounds/sfx/dice-roll.ogg'),
  'sfx.dice_settle': require('../../../assets/Sounds/sfx/dice-settle.ogg'),
  'sfx.tile_land': require('../../../assets/Sounds/sfx/tile-land.ogg'),
  'sfx.quiz_correct': require('../../../assets/Sounds/sfx/quiz-correct.ogg'),
  'sfx.quiz_wrong': require('../../../assets/Sounds/sfx/quiz-wrong.ogg'),
  'sfx.quiz_timeout': require('../../../assets/Sounds/sfx/quiz-timeout.ogg'),
  'sfx.quiz_tick': require('../../../assets/Sounds/sfx/quiz-tick.ogg'),
  'sfx.footstep': require('../../../assets/Sounds/sfx/footstep.ogg'),
  'sfx.fanfare': require('../../../assets/Sounds/sfx/fanfare.ogg'),
  'sfx.menu_whoosh': require('../../../assets/Sounds/sfx/menu-whoosh.ogg'),
};

const MUSIC_ASSETS = {
  'music.menu': require('../../../assets/Sounds/music/menu-theme.ogg'),
  'music.gameplay': require('../../../assets/Sounds/music/gameplay-theme.ogg'),
  'music.celebration': require('../../../assets/Sounds/music/celebration-sting.ogg'),
};

const AMBIENT_ASSETS = {
  'ambient.nature': require('../../../assets/Sounds/ambient/nature-bed.ogg'),
};

const LEGACY_SOUND_ALIASES = {
  clickA: 'ui.click_a',
  clickB: 'ui.click_b',
  switchA: 'ui.switch_a',
  switchB: 'ui.switch_b',
  tapA: 'ui.tap_a',
  tapB: 'ui.tap_b',
} satisfies Record<string, keyof typeof SFX_ASSETS>;

const DEFAULT_BUS_VOLUMES = {
  music: 0.6,
  ambient: 0.35,
  sfx: 1,
} as const;

type BusName = keyof typeof DEFAULT_BUS_VOLUMES;
type LegacySoundId = keyof typeof LEGACY_SOUND_ALIASES;
export type SfxId = keyof typeof SFX_ASSETS;
export type MusicId = keyof typeof MUSIC_ASSETS;
export type AmbientId = keyof typeof AMBIENT_ASSETS;
export type SoundId = LegacySoundId | SfxId;

type PlaySfxOptions = {
  volume?: number;
  playbackRate?: number;
};

type PlayLoopOptions = {
  fade?: number;
  loop?: boolean;
};

const clampVolume = (volume: number): number => Math.max(0, Math.min(1, volume));
const resolveSfxId = (soundId: SoundId): SfxId =>
  (soundId in LEGACY_SOUND_ALIASES
    ? LEGACY_SOUND_ALIASES[soundId as LegacySoundId]
    : soundId) as SfxId;

class AudioManager {
  private loadedSfx = new Map<SfxId, AudioPlayer>();
  private loadedMusic = new Map<MusicId, AudioPlayer>();
  private loadedAmbient = new Map<AmbientId, AudioPlayer>();
  private fadeTimers = new Map<AudioPlayer, ReturnType<typeof setInterval>>();
  private volumes: Record<BusName, number> = { ...DEFAULT_BUS_VOLUMES };
  private enabled = true;
  private modeConfigured = false;
  private currentMusic: { id: MusicId; player: AudioPlayer } | null = null;
  private currentAmbient: { id: AmbientId; player: AudioPlayer } | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (!enabled) {
      this.pauseLoop(this.currentMusic?.player);
      this.pauseLoop(this.currentAmbient?.player);
      return;
    }

    this.resumeLoop(this.currentMusic?.player, this.volumes.music);
    this.resumeLoop(this.currentAmbient?.player, this.volumes.ambient);
  }

  setBusVolume(bus: BusName, volume: number) {
    this.volumes[bus] = clampVolume(volume);

    if (bus === 'music' && this.currentMusic) {
      this.currentMusic.player.volume = this.enabled ? this.volumes.music : 0;
    }

    if (bus === 'ambient' && this.currentAmbient) {
      this.currentAmbient.player.volume = this.enabled ? this.volumes.ambient : 0;
    }
  }

  setVolumes(volumes: Partial<Record<BusName, number>>) {
    for (const [bus, volume] of Object.entries(volumes) as [BusName, number | undefined][]) {
      if (typeof volume === 'number') {
        this.setBusVolume(bus, volume);
      }
    }
  }

  async play(soundId: SoundId, options?: PlaySfxOptions): Promise<void> {
    await this.playSfx(resolveSfxId(soundId), options);
  }

  async playSfx(soundId: SfxId, options: PlaySfxOptions = {}): Promise<void> {
    if (!this.enabled) return;

    await this.ensureMode();
    const player = this.loadSfx(soundId);

    try {
      await player.seekTo(0);
    } catch {
      // Ignore seek failures and still try playback.
    }

    player.volume = clampVolume((options.volume ?? 1) * this.volumes.sfx);
    player.playbackRate = options.playbackRate ?? 1;
    player.play();
  }

  async stopSfx(soundId: SfxId): Promise<void> {
    const player = this.loadedSfx.get(soundId);
    if (!player) return;

    try {
      player.pause();
      await player.seekTo(0);
    } catch {
      // Stopping SFX is best-effort; a stale countdown tick is worse than a seek miss.
    }
  }

  async playMusic(musicId: MusicId, options: PlayLoopOptions = {}): Promise<void> {
    await this.ensureMode();
    const fadeMs = options.fade ?? 0;
    const nextPlayer = this.loadMusic(musicId);
    nextPlayer.loop = options.loop ?? true;

    if (this.currentMusic?.id === musicId) {
      nextPlayer.volume = this.enabled ? this.volumes.music : 0;
      if (this.enabled) nextPlayer.play();
      return;
    }

    const previousPlayer = this.currentMusic?.player;
    this.currentMusic = { id: musicId, player: nextPlayer };

    nextPlayer.volume = fadeMs > 0 ? 0 : this.enabled ? this.volumes.music : 0;
    if (this.enabled) {
      try {
        await nextPlayer.seekTo(0);
      } catch {
        // Safe to start from the current position when seeking is unavailable.
      }
      nextPlayer.play();
    }

    if (previousPlayer && previousPlayer !== nextPlayer) {
      this.fadePlayer(previousPlayer, 0, fadeMs, () => previousPlayer.pause());
    }
    this.fadePlayer(nextPlayer, this.enabled ? this.volumes.music : 0, fadeMs);
  }

  async stopMusic(fade = 0): Promise<void> {
    const player = this.currentMusic?.player;
    this.currentMusic = null;
    this.fadePlayer(player, 0, fade, () => player?.pause());
  }

  async playAmbient(ambientId: AmbientId, options: PlayLoopOptions = {}): Promise<void> {
    await this.ensureMode();
    const fadeMs = options.fade ?? 0;
    const nextPlayer = this.loadAmbient(ambientId);
    nextPlayer.loop = options.loop ?? true;

    if (this.currentAmbient?.id === ambientId) {
      nextPlayer.volume = this.enabled ? this.volumes.ambient : 0;
      if (this.enabled) nextPlayer.play();
      return;
    }

    const previousPlayer = this.currentAmbient?.player;
    this.currentAmbient = { id: ambientId, player: nextPlayer };

    nextPlayer.volume = fadeMs > 0 ? 0 : this.enabled ? this.volumes.ambient : 0;
    if (this.enabled) {
      try {
        await nextPlayer.seekTo(0);
      } catch {
        // Safe to start from the current position when seeking is unavailable.
      }
      nextPlayer.play();
    }

    if (previousPlayer && previousPlayer !== nextPlayer) {
      this.fadePlayer(previousPlayer, 0, fadeMs, () => previousPlayer.pause());
    }
    this.fadePlayer(nextPlayer, this.enabled ? this.volumes.ambient : 0, fadeMs);
  }

  async stopAmbient(fade = 0): Promise<void> {
    const player = this.currentAmbient?.player;
    this.currentAmbient = null;
    this.fadePlayer(player, 0, fade, () => player?.pause());
  }

  async disposeAll(): Promise<void> {
    for (const timer of this.fadeTimers.values()) {
      clearInterval(timer);
    }
    this.fadeTimers.clear();
    this.currentMusic = null;
    this.currentAmbient = null;

    await Promise.all(
      [
        ...Array.from(this.loadedSfx.values()),
        ...Array.from(this.loadedMusic.values()),
        ...Array.from(this.loadedAmbient.values()),
      ].map(async (player) => {
        try {
          player.pause();
          player.remove();
        } catch (err) {
          console.warn('[AudioManager] disposeAll: cleanup error', err);
        }
      })
    );
    this.loadedSfx.clear();
    this.loadedMusic.clear();
    this.loadedAmbient.clear();
  }

  private loadSfx(soundId: SfxId): AudioPlayer {
    const cached = this.loadedSfx.get(soundId);
    if (cached) return cached;

    const player = createAudioPlayer(SFX_ASSETS[soundId], {
      downloadFirst: true,
    });
    player.loop = false;
    player.volume = this.volumes.sfx;
    this.loadedSfx.set(soundId, player);
    return player;
  }

  private loadMusic(musicId: MusicId): AudioPlayer {
    const cached = this.loadedMusic.get(musicId);
    if (cached) return cached;

    const player = createAudioPlayer(MUSIC_ASSETS[musicId], {
      downloadFirst: true,
      keepAudioSessionActive: true,
    });
    player.loop = true;
    player.volume = this.volumes.music;
    this.loadedMusic.set(musicId, player);
    return player;
  }

  private loadAmbient(ambientId: AmbientId): AudioPlayer {
    const cached = this.loadedAmbient.get(ambientId);
    if (cached) return cached;

    const player = createAudioPlayer(AMBIENT_ASSETS[ambientId], {
      downloadFirst: true,
      keepAudioSessionActive: true,
    });
    player.loop = true;
    player.volume = this.volumes.ambient;
    this.loadedAmbient.set(ambientId, player);
    return player;
  }

  private pauseLoop(player: AudioPlayer | undefined) {
    if (!player) return;
    this.clearFade(player);
    player.pause();
    player.volume = 0;
  }

  private resumeLoop(player: AudioPlayer | undefined, volume: number) {
    if (!player) return;
    player.volume = volume;
    player.play();
  }

  private fadePlayer(
    player: AudioPlayer | undefined,
    targetVolume: number,
    durationMs: number,
    onDone?: () => void
  ) {
    if (!player) return;
    this.clearFade(player);

    if (durationMs <= 0) {
      player.volume = targetVolume;
      onDone?.();
      return;
    }

    const startVolume = player.volume;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const progress = clampVolume((Date.now() - startedAt) / durationMs);
      player.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress >= 1) {
        this.clearFade(player);
        onDone?.();
      }
    }, 50);

    this.fadeTimers.set(player, timer);
  }

  private clearFade(player: AudioPlayer) {
    const timer = this.fadeTimers.get(player);
    if (!timer) return;
    clearInterval(timer);
    this.fadeTimers.delete(player);
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
