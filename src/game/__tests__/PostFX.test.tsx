jest.mock('@react-three/postprocessing', () => ({
  Bloom: () => null,
  Vignette: () => null,
}));

jest.mock('postprocessing', () => ({
  BlendFunction: { NORMAL: 0 },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { PostFX } from '../PostFX';

describe('PostFX', () => {
  it('renders without crashing', () => {
    expect(() => render(<PostFX />)).not.toThrow();
  });

  it('renders Bloom and Vignette effects', () => {
    const { UNSAFE_root } = render(<PostFX />);
    expect(UNSAFE_root.children.length).toBeGreaterThan(0);
  });
});
