let mockPlatform: 'web' | 'ios' = 'web';

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    Platform: {
      ...actualReactNative.Platform,
      get OS() {
        return mockPlatform;
      },
      select: (obj: Record<string, unknown>) => obj[mockPlatform] ?? obj.default,
    },
    StyleSheet: {
      ...actualReactNative.StyleSheet,
      create: (styles: Record<string, unknown>) => styles,
      flatten: mockFlattenStyle,
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    },
  };
});

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

function mockFlattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => {
      if (item == null) return acc;
      const merged = Array.isArray(item)
        ? mockFlattenStyle(item)
        : (typeof item === 'object' ? { ...item as Record<string, unknown> } : {});
      return { ...acc, ...merged };
    }, {});
  }
  if (typeof style === 'object' && style !== null) return { ...style as Record<string, unknown> };
  return {};
}

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

  it('renders platform-specific host element on both platforms', () => {
    mockPlatform = 'web';
    const webResult = renderPanel();
    expect(webResult.getByTestId('glass-panel-web')).toBeTruthy();

    mockPlatform = 'ios';
    const iosResult = renderPanel();
    expect(iosResult.UNSAFE_root.findByType('BlurView')).toBeTruthy();
  });
});
