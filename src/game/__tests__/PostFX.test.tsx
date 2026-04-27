import React from 'react';
import { render } from '@testing-library/react-native';
import { Bloom, Vignette } from '@react-three/postprocessing';
import { PostFX } from '../PostFX';

jest.mock('@react-three/postprocessing', () => ({
  Bloom: jest.fn(() => null),
  Vignette: jest.fn(() => null),
}));

jest.mock('postprocessing', () => ({
  BlendFunction: { NORMAL: 0 },
}));

describe('PostFX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => render(<PostFX />)).not.toThrow();
  });

  it('renders Bloom and Vignette effects', () => {
    render(<PostFX />);
    expect(Bloom).toHaveBeenCalled();
    expect(Vignette).toHaveBeenCalled();
  });
});
