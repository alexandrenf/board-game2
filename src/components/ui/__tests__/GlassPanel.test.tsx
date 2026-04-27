import React from 'react';
import { render } from '@testing-library/react-native';
import { GlassPanel } from '../GlassPanel';

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

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

describe('GlassPanel', () => {
  function renderPanel() {
    return render(React.createElement(GlassPanel, null, 'child'));
  }

  it('renders BlurView on native platform', () => {
    mockPlatform = 'ios';
    const { UNSAFE_root: root } = renderPanel();
    expect(root.findByType('BlurView')).toBeTruthy();
  });

  it('renders View with testID on web', () => {
    mockPlatform = 'web';
    const { getByTestId } = renderPanel();
    expect(getByTestId('glass-panel-web')).toBeTruthy();
  });

  it('renders platform-specific host element on both platforms', () => {
    mockPlatform = 'web';
    const webResult = renderPanel();
    expect(webResult.getByTestId('glass-panel-web')).toBeTruthy();

    mockPlatform = 'ios';
    const iosResult = renderPanel();
    expect(iosResult.UNSAFE_root.findByType('BlurView')).toBeTruthy();
  });
});
