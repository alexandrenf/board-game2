import { renderHook } from '@testing-library/react-native';
import { useEscapeToClose } from '../useEscapeToClose';

let mockPlatform: 'web' | 'ios' = 'web';

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatform;
    },
    select: (obj: Record<string, unknown>) => obj[mockPlatform] ?? obj.default,
  },
}));

beforeEach(() => {
  mockPlatform = 'web';
});

describe('useEscapeToClose', () => {
  beforeEach(() => {
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds keydown listener on web when enabled', () => {
    mockPlatform = 'web';
    const { unmount } = renderHook(() =>
      useEscapeToClose(jest.fn(), true)
    );

    expect(window.addEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
    );
  });

  it('does not add listener when enabled=false', () => {
    mockPlatform = 'web';
    renderHook(() =>
      useEscapeToClose(jest.fn(), false)
    );

    expect(window.addEventListener).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', () => {
    mockPlatform = 'web';
    const onClose = jest.fn();
    renderHook(() =>
      useEscapeToClose(onClose, true)
    );

    const handler = (window.addEventListener as jest.Mock).mock.calls[0][1];
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

    expect(window.addEventListener).toHaveBeenCalledTimes(1);

    rerender({ cb: onClose2 });

    expect(window.removeEventListener).not.toHaveBeenCalled();

    const handler = (window.addEventListener as jest.Mock).mock.calls[0][1];
    handler({ key: 'Escape', preventDefault: jest.fn() } as unknown as KeyboardEvent);

    expect(onClose2).toHaveBeenCalledTimes(1);
    expect(onClose1).not.toHaveBeenCalled();
  });

  it('does nothing on non-web platforms', () => {
    mockPlatform = 'ios';
    renderHook(() =>
      useEscapeToClose(jest.fn(), true)
    );

    expect(window.addEventListener).not.toHaveBeenCalled();
  });
});
