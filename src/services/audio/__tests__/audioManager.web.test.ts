jest.unmock('@/src/services/audio/audioManager');

jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: jest.fn() },
}));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn(() => ({
      downloaded: true,
      localUri: 'http://localhost/test.m4a',
      uri: 'http://localhost/test.m4a',
      downloadAsync: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

import { audioManager } from '../audioManager';

const flushMicrotasks = () => new Promise<void>(resolve => setTimeout(resolve, 0));

function createMockAudioContext() {
  return {
    createGain: jest.fn(() => ({
      gain: { value: 1 },
      connect: jest.fn(),
    })),
    createBufferSource: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      playbackRate: { value: 1 },
      buffer: null,
    })),
    decodeAudioData: jest.fn(() => Promise.resolve({} as AudioBuffer)),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    state: 'running',
    destination: {},
  };
}

let mockContext: ReturnType<typeof createMockAudioContext>;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  mockContext = createMockAudioContext();
  (globalThis as any).AudioContext = jest.fn(() => mockContext);

  originalFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockResolvedValue({
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  }) as unknown as typeof globalThis.fetch;
});

afterEach(async () => {
  await audioManager.disposeAll();
  delete (globalThis as any).AudioContext;
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
  } else {
    delete (globalThis as any).fetch;
  }
});

describe('WebAudio path', () => {
  it('playSfx fetches, decodes, and starts a source node', async () => {
    audioManager.playSfx('ui.tap_a');
    await flushMicrotasks();

    expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost/test.m4a');
    expect(mockContext.decodeAudioData).toHaveBeenCalled();
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);
    expect(mockContext.resume).toHaveBeenCalled();

    const source = mockContext.createBufferSource.mock.results[0].value;
    expect(source.start).toHaveBeenCalledWith(0);
    expect(source.connect).toHaveBeenCalled();
  });

  it('deduplicates concurrent fetch for the same sound', async () => {
    audioManager.playSfx('ui.tap_a');
    audioManager.playSfx('ui.tap_a');
    await flushMicrotasks();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(2);
  });

  it('stopSfx stops active sources and clears tracking', async () => {
    audioManager.playSfx('ui.tap_a');
    await flushMicrotasks();

    const state = (audioManager as any).webAudio;
    expect(state.activeSources.size).toBe(1);

    const source = mockContext.createBufferSource.mock.results[0].value;

    audioManager.stopSfx('ui.tap_a');

    expect(source.stop).toHaveBeenCalled();
    expect(state.activeSources.size).toBe(0);
  });

  it('setBusVolume updates gain node value on web with cubic curve', () => {
    audioManager.playSfx('ui.tap_a');

    const state = (audioManager as any).webAudio;
    expect(state).not.toBeNull();

    const mainGain = mockContext.createGain.mock.results[0].value;
    expect(mainGain.gain.value).toBe(1);

    audioManager.setBusVolume('sfx', 0.5);

    expect(mainGain.gain.value).toBeCloseTo(0.125, 5);
  });

  it('disposeAll closes the AudioContext and clears state', async () => {
    audioManager.playSfx('ui.tap_a');
    expect((audioManager as any).webAudio).not.toBeNull();

    await audioManager.disposeAll();

    expect(mockContext.close).toHaveBeenCalled();
    expect((audioManager as any).webAudio).toBeNull();
  });
});
