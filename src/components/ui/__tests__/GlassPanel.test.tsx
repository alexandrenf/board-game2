let mockPlatform: 'web' | 'ios' = 'web';

jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatform;
    },
    select: (obj: Record<string, unknown>) => obj[mockPlatform] ?? obj.default,
  },
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    flatten: (style: unknown) => {
      if (Array.isArray(style)) return Object.assign({}, ...style);
      if (typeof style === 'object' && style !== null) return { ...style };
      return {};
    },
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  View: 'View',
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlassPanel } from '../GlassPanel';

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

  it('renders without crashing on both platforms', () => {
    for (const platform of ['web', 'ios'] as const) {
      mockPlatform = platform;
      expect(renderPanel).not.toThrow();
    }
  });
});
