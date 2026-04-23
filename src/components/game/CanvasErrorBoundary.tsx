import React from 'react';
import { BRAND, COLORS } from '@/src/constants/colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class CanvasErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.errorFallback}>
          <Text style={styles.errorTitle}>Algo deu errado</Text>
          <Text style={styles.errorMessage}>
            Não foi possível carregar a cena 3D.
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorFallback: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: BRAND.orange,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#7A5635',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: BRAND.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
