import { renderHook } from '@testing-library/react-native';
import { useEscapeToClose } from '../useEscapeToClose';

let mockPlatform: 'web' | 'ios' = 'web';

jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const mockPlatformObj = {
    get OS() {
      return mockPlatform;
    },
    select: (obj: Record<string, unknown>) => obj[mockPlatform] ?? obj.default,
  };
  return { default: mockPlatformObj };
});

beforeEach(() => {
  mockPlatform = 'web';
});

describe('useEscapeToClose', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds keydown listener on web when enabled', () => {
    mockPlatform = 'web';
    const { unmount } = renderHook(() =>
      useEscapeToClose(jest.fn(), true)
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('does not add listener when enabled=false', () => {
    mockPlatform = 'web';
    renderHook(() =>
      useEscapeToClose(jest.fn(), false)
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    mockPlatform = 'web';
    const onClose = jest.fn();
    renderHook(() =>
      useEscapeToClose(onClose, true)
    );

    const handler = addEventListenerSpy.mock.calls[0][1];
    handler({ key: 'Escape', preventDefault: jest.fn() } as unknown as KeyboardEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('registers listener when enabled transitions from false to true', () => {
    mockPlatform = 'web';
    const onClose = jest.fn();
    const { rerender } = renderHook(
      (props: { cb: () => void; enabled: boolean }) => useEscapeToClose(props.cb, props.enabled),
      { initialProps: { cb: onClose, enabled: false } },
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();

    rerender({ cb: onClose, enabled: true });

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    const handler = addEventListenerSpy.mock.calls[0][1];
    handler({ key: 'Escape', preventDefault: jest.fn() } as unknown as KeyboardEvent);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls updated onClose without re-adding listener', () => {
    mockPlatform = 'web';
    const onClose1 = jest.fn();
    const onClose2 = jest.fn();
    const { rerender } = renderHook(
      (props: { cb: () => void }) => useEscapeToClose(props.cb, true),
      { initialProps: { cb: onClose1 } },
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);

    rerender({ cb: onClose2 });

    expect(removeEventListenerSpy).not.toHaveBeenCalled();

    const handler = addEventListenerSpy.mock.calls[0][1];
    handler({ key: 'Escape', preventDefault: jest.fn() } as unknown as KeyboardEvent);

    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
  });

  it('does nothing on non-web platforms', () => {
    mockPlatform = 'ios';
    renderHook(() =>
      useEscapeToClose(jest.fn(), true)
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});
