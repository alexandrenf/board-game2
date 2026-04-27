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

const IS_WEB = Platform.OS === 'web';
const SFX_POOL_SIZE = 3;
const WEB_PRELOAD_SFX: SfxId[] = ['ui.tap_a', 'ui.click_a', 'sfx.dice_roll', 'sfx.quiz_tick'];

type WebAudioState = {
  context: AudioContext;
  busGains: Record<BusName, GainNode>;
  buffers: Map<SfxId, AudioBuffer>;
  loadPromises: Map<SfxId, Promise<AudioBuffer | null>>;
  activeSources: Map<SfxId, Set<AudioBufferSourceNode>>;
};

type WebMediaLoop = {
  id: string;
  element: HTMLAudioElement;
  sourceNode: MediaElementAudioSourceNode;
  loopGain: GainNode;
};

/** Clamp a volume value to the valid [0, 1] range. */
const clampVolume = (volume: number): number => Math.max(0, Math.min(1, volume));
// Linear amplitude feels binary to the ear (~6 dB drop at 50%). Cube the slider
// value so 50% sounds like ~12% and 10% is barely audible, giving the user a
// usable gradient instead of an on/off switch.
const VOLUME_CURVE_EXPONENT = 3;
/** Apply a cubic curve to linear volume so the slider feels more natural to the ear. */
const applyVolumeCurve = (value: number): number => {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value ** VOLUME_CURVE_EXPONENT;
};
/** Resolve legacy sound aliases to their canonical SfxId. */
const resolveSfxId = (soundId: SoundId): SfxId =>
  (soundId in LEGACY_SOUND_ALIASES
    ? LEGACY_SOUND_ALIASES[soundId as LegacySoundId]
    : soundId) as SfxId;

/** Central audio controller managing SFX pools, music/ambient loop players, and Web Audio API integration. */
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

  private webAudio: WebAudioState | null = null;
  private webLoops = new Map<string, WebMediaLoop>();
  private webLoopInflight = new Map<string, Promise<void>>();
  private webCurrentMusicId: MusicId | null = null;
  private webCurrentAmbientId: AmbientId | null = null;
  private webRampTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (IS_WEB) {
      const state = this.webAudio;
      if (state) {
        const busKeys = Object.keys(state.busGains) as BusName[];
        for (const bus of busKeys) {
          state.busGains[bus].gain.value = enabled ? this.outputVolume(bus) : 0;
        }
      }
      if (!enabled) {
        this.stopAllWebSfx();
        for (const loop of this.webLoops.values()) {
          try { loop.element.pause(); } catch { /* best effort */ }
        }
      } else {
        for (const loop of this.webLoops.values()) {
          if (loop.element.paused) {
            loop.element.play().catch(() => {});
          }
        }
      }
      return;
    }

    const effectiveSfx = enabled ? this.outputVolume('sfx') : 0;
    for (const pool of this.sfxPools.values()) {
      for (const player of pool.players) {
        player.volume = effectiveSfx;
      }
    }

    if (!enabled) {
      this.pauseLoop(this.currentMusic?.player);
      this.pauseLoop(this.currentAmbient?.player);
      return;
    }

    this.resumeLoop(this.currentMusic?.player, this.outputVolume('music'));
    this.resumeLoop(this.currentAmbient?.player, this.outputVolume('ambient'));
  }

  private outputVolume(bus: BusName): number {
    return applyVolumeCurve(this.volumes[bus]);
  }

  setBusVolume(bus: BusName, volume: number) {
    this.volumes[bus] = clampVolume(volume);

    if (IS_WEB) {
      const state = this.webAudio;
      if (!state) return;
      state.busGains[bus].gain.value = this.enabled ? this.outputVolume(bus) : 0;
      return;
    }

    if (bus === 'sfx') {
      const effectiveSfx = this.enabled ? this.outputVolume('sfx') : 0;
      for (const pool of this.sfxPools.values()) {
        for (const player of pool.players) {
          player.volume = effectiveSfx;
        }
      }
    }

    if (bus === 'music' && this.currentMusic) {
      const effectiveVolume = this.enabled ? this.outputVolume('music') : 0;
      this.currentMusic.player.volume = effectiveVolume;
      this.currentMusic.player.muted = effectiveVolume <= 0;
      if (this.enabled && !this.currentMusic.player.playing) {
        this.currentMusic.player.play();
      }
    }

    if (bus === 'ambient' && this.currentAmbient) {
      const effectiveVolume = this.enabled ? this.outputVolume('ambient') : 0;
      this.currentAmbient.player.volume = effectiveVolume;
      this.currentAmbient.player.muted = effectiveVolume <= 0;
      if (this.enabled && !this.currentAmbient.player.playing) {
        this.currentAmbient.player.play();
      }
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
      return;
    }

    for (const soundId of Object.keys(SFX_ASSETS) as SfxId[]) {
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

    void this.ensureMode();

    const pool = this.sfxPools.get(soundId) ?? this.warmSfx(soundId);

    const player = pool.players[pool.cursor];
    pool.cursor = (pool.cursor + 1) % pool.players.length;

    void player.seekTo(0).catch(() => {});

    player.volume = clampVolume((options.volume ?? 1) * this.outputVolume('sfx'));
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
        } catch {}
      })
    );
  }

  async playMusic(musicId: MusicId, options: PlayLoopOptions = {}): Promise<void> {
    await this.ensureMode();
    const fadeMs = options.fade ?? 0;

    if (IS_WEB) {
      this.playWebLoop(musicId, 'music', MUSIC_ASSETS[musicId], fadeMs, options.loop ?? true);
      return;
    }

    const nextPlayer = this.loadMusic(musicId);
    nextPlayer.loop = options.loop ?? true;

    if (this.currentMusic?.id === musicId) {
      const targetVolume = this.enabled ? this.outputVolume('music') : 0;
      nextPlayer.volume = targetVolume;
      nextPlayer.muted = targetVolume <= 0;
      if (this.enabled && !nextPlayer.playing) nextPlayer.play();
      return;
    }

    const previousPlayer = this.currentMusic?.player;
    this.currentMusic = { id: musicId, player: nextPlayer };

    const targetVolume = this.enabled ? this.outputVolume('music') : 0;
    nextPlayer.volume = fadeMs > 0 ? 0 : targetVolume;
    nextPlayer.muted = targetVolume <= 0;
    if (this.enabled) {
      try {
        await nextPlayer.seekTo(0);
      } catch {}
      nextPlayer.play();
    }

    if (previousPlayer && previousPlayer !== nextPlayer) {
      this.fadePlayer(previousPlayer, 0, fadeMs, () => previousPlayer.pause());
    }
    this.fadePlayer(nextPlayer, targetVolume, fadeMs);
  }

  async stopMusic(fade = 0): Promise<void> {
    if (IS_WEB) {
      this.stopWebLoop('music', fade);
      return;
    }
    const player = this.currentMusic?.player;
    this.currentMusic = null;
    this.fadePlayer(player, 0, fade, () => player?.pause());
  }

  async playAmbient(ambientId: AmbientId, options: PlayLoopOptions = {}): Promise<void> {
    await this.ensureMode();
    const fadeMs = options.fade ?? 0;

    if (IS_WEB) {
      this.playWebLoop(ambientId, 'ambient', AMBIENT_ASSETS[ambientId], fadeMs, options.loop ?? true);
      return;
    }

    const nextPlayer = this.loadAmbient(ambientId);
    nextPlayer.loop = options.loop ?? true;

    if (this.currentAmbient?.id === ambientId) {
      const targetVolume = this.enabled ? this.outputVolume('ambient') : 0;
      nextPlayer.volume = targetVolume;
      nextPlayer.muted = targetVolume <= 0;
      if (this.enabled && !nextPlayer.playing) nextPlayer.play();
      return;
    }

    const previousPlayer = this.currentAmbient?.player;
    this.currentAmbient = { id: ambientId, player: nextPlayer };

    const targetVolume = this.enabled ? this.outputVolume('ambient') : 0;
    nextPlayer.volume = fadeMs > 0 ? 0 : targetVolume;
    nextPlayer.muted = targetVolume <= 0;
    if (this.enabled) {
      try {
        await nextPlayer.seekTo(0);
      } catch {}
      nextPlayer.play();
    }

    if (previousPlayer && previousPlayer !== nextPlayer) {
      this.fadePlayer(previousPlayer, 0, fadeMs, () => previousPlayer.pause());
    }
    this.fadePlayer(nextPlayer, targetVolume, fadeMs);
  }

  async stopAmbient(fade = 0): Promise<void> {
    if (IS_WEB) {
      this.stopWebLoop('ambient', fade);
      return;
    }
    const player = this.currentAmbient?.player;
    this.currentAmbient = null;
    this.fadePlayer(player, 0, fade, () => player?.pause());
  }

  stopAllLoops(): void {
    if (IS_WEB) {
      this.stopAllWebLoops();
      return;
    }
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

    if (this.webAudio) {
      this.stopAllWebSfx();
      this.stopAllWebLoops();

      const pendingLoads = Array.from(this.webAudio.loadPromises.values());
      if (pendingLoads.length > 0) {
        await Promise.allSettled(pendingLoads);
      }

      this.webAudio.buffers.clear();
      this.webAudio.loadPromises.clear();
      this.webAudio.activeSources.clear();

      for (const timeout of this.webRampTimeouts.values()) {
        clearTimeout(timeout);
      }
      this.webRampTimeouts.clear();

      try {
        await this.webAudio.context.close();
      } catch (err) {
        console.warn('[AudioManager] disposeAll: web audio context close error', err);
      }

      this.webAudio = null;
      this.webLoops.clear();
      this.webLoopInflight.clear();
      this.webCurrentMusicId = null;
      this.webCurrentAmbientId = null;
    }

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
      player.volume = this.outputVolume('sfx');
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

  private getWebAudioState(): WebAudioState | null {
    if (!IS_WEB) return null;
    if (this.webAudio) return this.webAudio;
    const Ctx =
      globalThis.AudioContext ??
      (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;

    const context = new Ctx();
    const busKeys: BusName[] = ['sfx', 'music', 'ambient'];
    const busGains = {} as Record<BusName, GainNode>;
    for (const key of busKeys) {
      const gain = context.createGain();
      gain.gain.value = this.enabled ? this.outputVolume(key) : 0;
      gain.connect(context.destination);
      busGains[key] = gain;
    }

    this.webAudio = {
      context,
      busGains,
      buffers: new Map<SfxId, AudioBuffer>(),
      loadPromises: new Map<SfxId, Promise<AudioBuffer | null>>(),
      activeSources: new Map<SfxId, Set<AudioBufferSourceNode>>(),
    };
    return this.webAudio;
  }

  private async preloadWebSfx(soundIds: readonly SfxId[]): Promise<void> {
    const loads = soundIds.map((soundId) => this.loadWebSfxBuffer(soundId));
    await Promise.all(loads);
  }

  private loadWebSfxBuffer(soundId: SfxId): Promise<AudioBuffer | null> {
    const state = this.getWebAudioState();
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
    const state = this.getWebAudioState();
    if (!state) {
      this.preloadSfxLater(soundId);
      return;
    }

    const playBuffer = (buffer: AudioBuffer) => {
      const source = state.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = options.playbackRate ?? 1;

      const gainNode = state.context.createGain();
      gainNode.gain.value = clampVolume(options.volume ?? 1);
      source.connect(gainNode);
      gainNode.connect(state.busGains.sfx);

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
      if (!this.webAudio || state.context.state === 'closed') return;
      playBuffer(buffer);
    });
  }

  private stopWebSfx(soundId: SfxId): void {
    const state = this.webAudio;
    if (!state) return;
    const active = state.activeSources.get(soundId);
    if (!active) return;
    for (const source of active) {
      try {
        source.stop();
      } catch {}
    }
    active.clear();
    state.activeSources.delete(soundId);
  }

  private stopAllWebSfx(): void {
    const state = this.webAudio;
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
    player.volume = this.outputVolume('music');
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
    player.volume = this.outputVolume('ambient');
    this.loadedAmbient.set(ambientId, player);
    return player;
  }

  private async playWebLoop(
    id: MusicId | AmbientId,
    bus: 'music' | 'ambient',
    assetModule: number,
    fadeMs: number,
    loop: boolean
  ): Promise<void> {
    const state = this.getWebAudioState();
    if (!state) return;

    const existing = this.webLoops.get(id);
    if (existing) {
      state.busGains[bus].gain.value = this.enabled ? this.outputVolume(bus) : 0;
      if (this.enabled && existing.element.paused) {
        existing.element.play().catch(() => {});
      }
      return;
    }

    const inflight = this.webLoopInflight.get(id);
    if (inflight) {
      await inflight;
      const created = this.webLoops.get(id);
      if (created) {
        state.busGains[bus].gain.value = this.enabled ? this.outputVolume(bus) : 0;
        if (this.enabled && created.element.paused) {
          created.element.play().catch(() => {});
        }
      }
      return;
    }

    const creationPromise = this.createWebLoop(id, bus, assetModule, fadeMs, loop);
    this.webLoopInflight.set(id, creationPromise);
    try {
      await creationPromise;
    } finally {
      this.webLoopInflight.delete(id);
    }
  }

  private async createWebLoop(
    id: MusicId | AmbientId,
    bus: 'music' | 'ambient',
    assetModule: number,
    fadeMs: number,
    loop: boolean
  ): Promise<void> {
    const state = this.getWebAudioState();
    if (!state) return;

    const asset = Asset.fromModule(assetModule);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    if (!uri) return;

    const element = new Audio(uri);
    element.loop = loop;
    element.volume = 1;
    element.muted = false;

    await state.context.resume();

    const sourceNode = state.context.createMediaElementSource(element);
    const loopGain = state.context.createGain();
    loopGain.gain.value = 0;

    sourceNode.connect(loopGain);
    loopGain.connect(state.busGains[bus]);

    const loopEntry: WebMediaLoop = { id, element, sourceNode, loopGain };
    this.webLoops.set(id, loopEntry);

    const currentId = bus === 'music' ? this.webCurrentMusicId : this.webCurrentAmbientId;
    const oldEntry = currentId ? this.webLoops.get(currentId) : undefined;

    if (oldEntry && oldEntry !== loopEntry) {
      this.fadeOutWebLoop(oldEntry, fadeMs);
    }

    if (bus === 'music') {
      this.webCurrentMusicId = id as MusicId;
    } else {
      this.webCurrentAmbientId = id as AmbientId;
    }

    element.play().catch(() => {});

    this.fadeInWebLoop(loopEntry, fadeMs);

    state.busGains[bus].gain.value = this.enabled ? this.volumes[bus] : 0;
  }

  private fadeOutWebLoop(entry: WebMediaLoop, fadeMs: number): void {
    const ctx = this.webAudio?.context;
    if (!ctx) return;

    const now = ctx.currentTime;
    entry.loopGain.gain.cancelScheduledValues(now);
    entry.loopGain.gain.setValueAtTime(entry.loopGain.gain.value, now);
    entry.loopGain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);

    const timeout = setTimeout(() => {
      try { entry.element.pause(); } catch {}
      try { entry.sourceNode.disconnect(); } catch {}
      this.webLoops.delete(entry.id);
      this.webRampTimeouts.delete(entry.id);
    }, fadeMs + 50);
    this.webRampTimeouts.set(entry.id, timeout);
  }

  private fadeInWebLoop(entry: WebMediaLoop, fadeMs: number): void {
    const ctx = this.webAudio?.context;
    if (!ctx) return;

    const now = ctx.currentTime;
    entry.loopGain.gain.cancelScheduledValues(now);
    entry.loopGain.gain.setValueAtTime(0, now);
    if (fadeMs > 0) {
      entry.loopGain.gain.linearRampToValueAtTime(1, now + fadeMs / 1000);
    } else {
      entry.loopGain.gain.value = 1;
    }
  }

  private stopWebLoop(bus: 'music' | 'ambient', fadeMs: number): void {
    const currentId = bus === 'music' ? this.webCurrentMusicId : this.webCurrentAmbientId;
    const entry = currentId ? this.webLoops.get(currentId) : undefined;

    if (bus === 'music') this.webCurrentMusicId = null;
    else this.webCurrentAmbientId = null;

    if (!entry) return;
    this.fadeOutWebLoop(entry, fadeMs);
  }

  private stopAllWebLoops(): void {
    for (const entry of this.webLoops.values()) {
      const existingTimeout = this.webRampTimeouts.get(entry.id);
      if (existingTimeout) clearTimeout(existingTimeout);
      try { entry.sourceNode.disconnect(); } catch {}
      try { entry.element.pause(); } catch {}
    }
    this.webLoops.clear();
    this.webLoopInflight.clear();
    this.webCurrentMusicId = null;
    this.webCurrentAmbientId = null;
    for (const timeout of this.webRampTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.webRampTimeouts.clear();
  }

  private pauseLoop(player: AudioPlayer | undefined) {
    if (!player) return;
    this.clearFade(player);
    player.pause();
    player.volume = 0;
    player.muted = true;
  }

  private resumeLoop(player: AudioPlayer | undefined, volume: number) {
    if (!player) return;
    player.volume = volume;
    player.muted = volume <= 0;
    // Always keep loop players running so the iOS PWA audio session stays
    // alive; relying on `muted` to silence when the slider is at 0.
    if (!player.playing) player.play();
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
      player.muted = targetVolume <= 0;
      onDone?.();
      return;
    }

    const startVolume = player.volume;
    const startedAt = Date.now();

    const step = () => {
      const progress = clampVolume((Date.now() - startedAt) / durationMs);
      player.volume = startVolume + (targetVolume - startVolume) * progress;
      player.muted = player.volume <= 0;
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
