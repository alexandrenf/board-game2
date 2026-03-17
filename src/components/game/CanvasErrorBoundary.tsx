import React from 'react';

type Props = {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onError?: (error: Error) => void;
};

type State = {
  hasError: boolean;
};

export class CanvasErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
