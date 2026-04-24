import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

const SFX_ASSETS = {
  'ui.click_a': require('../../../assets/Sounds/click-a.m4a'),
  'ui.click_b': require('../../../assets/Sounds/click-b.m4a'),
  'ui.switch_a': require('../../../assets/Sounds/switch-a.m4a'),
  'ui.switch_b': require('../../../assets/Sounds/switch-b.m4a'),
  'ui.tap_a': require('../../../assets/Sounds/tap-a.m4a'),
  'ui.tap_b': require('../../../assets/Sounds/tap-b.m4a'),
  'sfx.dice_roll': require('../../../assets/Sounds/sfx/dice-roll.m4a'),
  'sfx.dice_settle': require('../../../assets/Sounds/sfx/dice-settle.m4a'),
  'sfx.tile_land': require('../../../assets/Sounds/sfx/tile-land.m4a'),
  'sfx.quiz_correct': require('../../../assets/Sounds/sfx/quiz-correct.m4a'),
  'sfx.quiz_wrong': require('../../../assets/Sounds/sfx/quiz-wrong.m4a'),
  'sfx.quiz_timeout': require('../../../assets/Sounds/sfx/quiz-timeout.m4a'),
  'sfx.quiz_tick': require('../../../assets/Sounds/sfx/quiz-tick.m4a'),
  'sfx.footstep': require('../../../assets/Sounds/sfx/footstep.m4a'),
  'sfx.fanfare': require('../../../assets/Sounds/sfx/fanfare.m4a'),
  'sfx.menu_whoosh': require('../../../assets/Sounds/sfx/menu-whoosh.m4a'),
};

const MUSIC_ASSETS = {
  'music.menu': require('../../../assets/Sounds/music/menu-theme.m4a'),
  'music.gameplay': require('../../../assets/Sounds/music/gameplay-theme.m4a'),
  'music.celebration': require('../../../assets/Sounds/music/celebration-sting.m4a'),
};

const AMBIENT_ASSETS = {
  'ambient.nature': require('../../../assets/Sounds/ambient/nature-bed.m4a'),
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

type SfxVoicePool = {
  players: AudioPlayer[];
  cursor: number;
};

type WebSfxState = {
  context: AudioContext;
  gainNode: GainNode;
  buffers: Map<SfxId, AudioBuffer>;
  loadPromises: Map<SfxId, Promise<AudioBuffer | null>>;
  activeSources: Map<SfxId, Set<AudioBufferSourceNode>>;
};

// On web, expo-audio is backed by HTMLAudioElement; a blocking download-first preload
// stalls Safari's boot screen when every asset is serialised.
const IS_WEB = Platform.OS === 'web';
const SFX_POOL_SIZE = 3;
const WEB_PRELOAD_SFX: SfxId[] = ['ui.tap_a', 'ui.click_a', 'sfx.dice_roll', 'sfx.quiz_tick'];

const clampVolume = (volume: number): number => Math.max(0, Math.min(1, volume));
const resolveSfxId = (soundId: SoundId): SfxId =>
  (soundId in LEGACY_SOUND_ALIASES
    ? LEGACY_SOUND_ALIASES[soundId as LegacySoundId]
    : soundId) as SfxId;

class AudioManager {
  private sfxPools = new Map<SfxId, SfxVoicePool>();
  private loadedMusic = new Map<MusicId, AudioPlayer>();
  private loadedAmbient = new Map<AmbientId, AudioPlayer>();
  private fadeHandles = new Map<AudioPlayer, { cancel: () => void }>();
  private volumes: Record<BusName, number> = { ...DEFAULT_BUS_VOLUMES };
  private enabled = true;
  private modeConfigured = false;
  private currentMusic: { id: MusicId; player: AudioPlayer } | null = null;
  private currentAmbient: { id: AmbientId; player: AudioPlayer } | null = null;
  private webSfx: WebSfxState | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (IS_WEB) {
      const state = this.webSfx;
      if (state) {
        state.gainNode.gain.value = enabled ? this.volumes.sfx : 0;
        if (!enabled) {
          this.stopAllWebSfx();
        }
      }
    }

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

    if (bus === 'sfx' && IS_WEB) {
      const state = this.webSfx;
      if (state) {
        state.gainNode.gain.value = this.enabled ? this.volumes.sfx : 0;
      }
    }

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

  async preloadAll(): Promise<void> {
    await this.ensureMode();

    if (IS_WEB) {
      await this.preloadWebSfx(WEB_PRELOAD_SFX);
    }

    for (const soundId of Object.keys(SFX_ASSETS) as SfxId[]) {
      if (IS_WEB) continue;
      this.warmSfx(soundId);
    }
    for (const musicId of Object.keys(MUSIC_ASSETS) as MusicId[]) {
      this.loadMusic(musicId);
    }
    for (const ambientId of Object.keys(AMBIENT_ASSETS) as AmbientId[]) {
      this.loadAmbient(ambientId);
    }
  }

  play(soundId: SoundId, options?: PlaySfxOptions): void {
    this.playSfx(resolveSfxId(soundId), options);
  }

  playSfx(soundId: SfxId, options: PlaySfxOptions = {}): void {
    if (!this.enabled) return;

    if (IS_WEB) {
      this.playSfxWeb(soundId, options);
      return;
    }

    const pool = this.sfxPools.get(soundId);
    if (!pool) {
      this.preloadSfxLater(soundId);
      return;
    }

    const player = pool.players[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.players.length;

    void player.seekTo(0).catch(() => {
      // Ignore seek failures and still try immediate playback.
    });

    player.volume = clampVolume((options.volume ?? 1) * this.volumes.sfx);
    player.playbackRate = options.playbackRate ?? 1;
    player.play();
  }

  async stopSfx(soundId: SfxId): Promise<void> {
    if (IS_WEB) {
      this.stopWebSfx(soundId);
      return;
    }

    const pool = this.sfxPools.get(soundId);
    if (!pool) return;

    await Promise.all(
      pool.players.map(async (player) => {
        try {
          player.pause();
          await player.seekTo(0);
        } catch {
          // Stopping SFX is best-effort; a stale countdown tick is worse than a seek miss.
        }
      })
    );
  }

  async playMusic(musicId: MusicId, options: PlayLoopOptions = {}): Promise<void> {
    await this.ensureMode();
    const fadeMs = options.fade ?? 0;
    const nextPlayer = this.loadMusic(musicId);
    nextPlayer.loop = options.loop ?? true;

    if (this.currentMusic?.id === musicId) {
      nextPlayer.volume = this.enabled ? this.volumes.music : 0;
      if (this.enabled && !nextPlayer.playing) nextPlayer.play();
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
      if (this.enabled && !nextPlayer.playing) nextPlayer.play();
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

  stopAllLoops(): void {
    const players = [this.currentMusic?.player, this.currentAmbient?.player];
    this.currentMusic = null;
    this.currentAmbient = null;

    for (const player of players) {
      if (!player) continue;
      this.clearFade(player);
      player.pause();
      player.volume = 0;
    }
  }

  async disposeAll(): Promise<void> {
    for (const handle of this.fadeHandles.values()) {
      handle.cancel();
    }
    this.fadeHandles.clear();
    this.currentMusic = null;
    this.currentAmbient = null;

    const allPlayers: AudioPlayer[] = [];
    for (const pool of this.sfxPools.values()) {
      allPlayers.push(...pool.players);
    }
    allPlayers.push(...Array.from(this.loadedMusic.values()));
    allPlayers.push(...Array.from(this.loadedAmbient.values()));

    await Promise.all(
      allPlayers.map(async (player) => {
        try {
          player.pause();
          player.remove();
        } catch (err) {
          console.warn('[AudioManager] disposeAll: cleanup error', err);
        }
      })
    );
    this.sfxPools.clear();
    this.loadedMusic.clear();
    this.loadedAmbient.clear();

    if (this.webSfx) {
      const webSfx = this.webSfx;

      this.stopAllWebSfx();

      const pendingLoads = Array.from(webSfx.loadPromises.values());
      if (pendingLoads.length > 0) {
        await Promise.allSettled(pendingLoads);
      }

      for (const source of webSfx.activeSources.values()) {
        try {
          (source as { disconnect?: () => void }).disconnect?.();
        } catch (err) {
          console.warn('[AudioManager] disposeAll: web source disconnect error', err);
        }
      }

      webSfx.buffers.clear();
      webSfx.loadPromises.clear();
      webSfx.activeSources.clear();

      try {
        await webSfx.context.close();
      } catch (err) {
        console.warn('[AudioManager] disposeAll: web audio context close error', err);
      }

      this.webSfx = null;
    }
  }

  private warmSfx(soundId: SfxId): SfxVoicePool {
    const existing = this.sfxPools.get(soundId);
    if (existing) return existing;

    const players: AudioPlayer[] = [];
    for (let i = 0; i < SFX_POOL_SIZE; i += 1) {
      const player = createAudioPlayer(SFX_ASSETS[soundId], {
        downloadFirst: !IS_WEB,
      });
      player.loop = false;
      player.volume = this.volumes.sfx;
      players.push(player);
    }
    const pool: SfxVoicePool = { players, cursor: 0 };
    this.sfxPools.set(soundId, pool);
    return pool;
  }

  private preloadSfxLater(soundId: SfxId): void {
    setTimeout(() => {
      if (IS_WEB) {
        void this.loadWebSfxBuffer(soundId);
        return;
      }
      if (this.sfxPools.has(soundId)) return;
      void this.ensureMode();
      this.warmSfx(soundId);
    }, 0);
  }

  private getWebSfxState(): WebSfxState | null {
    if (!IS_WEB) return null;
    if (this.webSfx) return this.webSfx;
    const Ctx =
      globalThis.AudioContext ??
      (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;

    const context = new Ctx();
    const gainNode = context.createGain();
    gainNode.gain.value = this.enabled ? this.volumes.sfx : 0;
    gainNode.connect(context.destination);

    this.webSfx = {
      context,
      gainNode,
      buffers: new Map<SfxId, AudioBuffer>(),
      loadPromises: new Map<SfxId, Promise<AudioBuffer | null>>(),
      activeSources: new Map<SfxId, Set<AudioBufferSourceNode>>(),
    };
    return this.webSfx;
  }

  private async preloadWebSfx(soundIds: readonly SfxId[]): Promise<void> {
    const loads = soundIds.map((soundId) => this.loadWebSfxBuffer(soundId));
    await Promise.all(loads);
  }

  private loadWebSfxBuffer(soundId: SfxId): Promise<AudioBuffer | null> {
    const state = this.getWebSfxState();
    if (!state) return Promise.resolve(null);

    const existing = state.buffers.get(soundId);
    if (existing) return Promise.resolve(existing);

    const inFlight = state.loadPromises.get(soundId);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<AudioBuffer | null> => {
      try {
        const asset = Asset.fromModule(SFX_ASSETS[soundId]);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        const assetUri = asset.localUri ?? asset.uri;
        if (!assetUri) return null;
        const response = await fetch(assetUri);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await state.context.decodeAudioData(arrayBuffer.slice(0));
        state.buffers.set(soundId, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        state.loadPromises.delete(soundId);
      }
    })();

    state.loadPromises.set(soundId, promise);
    return promise;
  }

  private playSfxWeb(soundId: SfxId, options: PlaySfxOptions = {}): void {
    const state = this.getWebSfxState();
    if (!state) {
      this.preloadSfxLater(soundId);
      return;
    }

    const playBuffer = (buffer: AudioBuffer) => {
      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = options.playbackRate ?? 1;

      const gainNode = state.context.createGain();
      gainNode.gain.value = clampVolume((options.volume ?? 1) * this.volumes.sfx);
      source.connect(gainNode);
      gainNode.connect(state.gainNode);

      let active = state.activeSources.get(soundId);
      if (!active) {
        active = new Set<AudioBufferSourceNode>();
        state.activeSources.set(soundId, active);
      }
      active.add(source);

      source.onended = () => {
        active?.delete(source);
        if (active && active.size === 0) {
          state.activeSources.delete(soundId);
        }
      };
      source.start(0);
    };

    void state.context.resume().catch(() => {});

    const loaded = state.buffers.get(soundId);
    if (loaded) {
      playBuffer(loaded);
      return;
    }

    void this.loadWebSfxBuffer(soundId).then((buffer) => {
      if (!buffer || !this.enabled) return;
      playBuffer(buffer);
    });
  }

  private stopWebSfx(soundId: SfxId): void {
    const state = this.webSfx;
    if (!state) return;
    const active = state.activeSources.get(soundId);
    if (!active) return;
    for (const source of active) {
      try {
        source.stop();
      } catch {
        // Best effort.
      }
    }
    active.clear();
    state.activeSources.delete(soundId);
  }

  private stopAllWebSfx(): void {
    const state = this.webSfx;
    if (!state) return;
    for (const soundId of state.activeSources.keys()) {
      this.stopWebSfx(soundId);
    }
  }

  private loadMusic(musicId: MusicId): AudioPlayer {
    const cached = this.loadedMusic.get(musicId);
    if (cached) return cached;

    const player = createAudioPlayer(MUSIC_ASSETS[musicId], {
      downloadFirst: !IS_WEB,
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
      downloadFirst: !IS_WEB,
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

    const step = () => {
      const progress = clampVolume((Date.now() - startedAt) / durationMs);
      player.volume = startVolume + (targetVolume - startVolume) * progress;
      if (progress >= 1) {
        this.clearFade(player);
        onDone?.();
      }
    };

    if (IS_WEB && typeof requestAnimationFrame === 'function') {
      let rafId = 0;
      const tick = () => {
        step();
        if (this.fadeHandles.get(player)?.cancel !== cancelFn) return;
        rafId = requestAnimationFrame(tick);
      };
      const cancelFn = () => cancelAnimationFrame(rafId);
      this.fadeHandles.set(player, { cancel: cancelFn });
      rafId = requestAnimationFrame(tick);
    } else {
      const timer = setInterval(step, 50);
      this.fadeHandles.set(player, { cancel: () => clearInterval(timer) });
    }
  }

  private clearFade(player: AudioPlayer) {
    const handle = this.fadeHandles.get(player);
    if (!handle) return;
    handle.cancel();
    this.fadeHandles.delete(player);
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
