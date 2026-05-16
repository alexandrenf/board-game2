import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type StuckRoomBannerProps = {
  visible: boolean;
  busy: boolean;
  onRetry: () => void;
};

export const StuckRoomBanner: React.FC<StuckRoomBannerProps> = ({ visible, busy, onRetry }) => {
  if (!visible) return null;
  return (
    <View
      style={styles.banner}
      pointerEvents="box-none"
      accessibilityRole="alert"
      accessibilityLabel="O jogo pode estar travado. Toque em Destravar jogada para continuar."
    >
      <View style={styles.iconWrap}>
        <AppIcon name="triangle-exclamation" size={14} color="#FFFFFF" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>O jogo pode estar travado</Text>
        <Text style={styles.subtitle}>Sem atividade há mais de 30 segundos.</Text>
      </View>
      <AnimatedButton
        onPress={onRetry}
        disabled={busy}
        style={styles.cta}
        hapticStyle="medium"
        accessibilityLabel="Destravar jogada"
        testID="btn-multiplayer-unstick"
      >
        <Text style={styles.ctaText}>{busy ? 'Tentando...' : 'Destravar jogada'}</Text>
      </AnimatedButton>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF1D6',
    borderColor: '#B78D5F',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  title: {
    fontWeight: '800',
    color: '#4E2C17',
    fontSize: 13,
  },
  subtitle: {
    color: '#7A5230',
    fontSize: 11,
    marginTop: 1,
  },
  cta: {
    backgroundColor: '#4E2C17',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
