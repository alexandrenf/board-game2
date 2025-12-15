import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiParticleProps {
  delay: number;
  color: string;
  startX: number;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ delay, color, startX }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: height + 50,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: startX + (Math.random() - 0.5) * 100,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 720,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [delay, startX, translateY, translateX, rotate, opacity]);

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({
              inputRange: [0, 720],
              outputRange: ['0deg', '720deg'],
            })},
          ],
          opacity,
        },
      ]}
    />
  );
};

interface CelebrationOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ visible, onDismiss }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  // Neobrutalist Neon Colors
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF006E', '#8338EC', '#3A86FF'];
  
  useEffect(() => {
    if (visible) {
      triggerHaptic('success');
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 12,
        bounciness: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, scaleAnim]);

  if (!visible) return null;

  return (
    <View style={styles.celebrationOverlay}>
      {/* Confetti - Increased count for Juice */}
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiParticle
          key={i}
          delay={i * 30}
          color={confettiColors[i % confettiColors.length]}
          startX={(i / 50) * width}
        />
      ))}
      
      <Animated.View style={[styles.celebrationCard, { transform: [{ scale: scaleAnim }] }]}>
        <AppIcon
          name="champagne-glasses"
          size={64}
          color={COLORS.gold}
          style={styles.celebrationEmoji}
        />
        <Text style={styles.celebrationTitle}>PARABÉNS!</Text>
        <Text style={styles.celebrationSubtitle}>Você completou a jornada!</Text>
        
        <View style={styles.celebrationStats}>
          <View style={styles.celebrationStatItem}>
            <AppIcon name="star" size={32} color={COLORS.warning} />
            <Text style={styles.celebrationStatLabel}>3 Estrelas</Text>
          </View>
          <View style={styles.celebrationStatItem}>
            <AppIcon name="trophy" size={32} color={COLORS.warning} />
            <Text style={styles.celebrationStatLabel}>Novo Recorde</Text>
          </View>
        </View>
        
        <AnimatedButton style={styles.celebrationButton} onPress={onDismiss} hapticStyle="medium">
          <Text style={styles.celebrationButtonText}>CONTINUAR</Text>
        </AnimatedButton>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebrationCard: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    maxWidth: 300,
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  celebrationSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 8,
  },
  celebrationStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 24,
    marginBottom: 24,
  },
  celebrationStatItem: {
    alignItems: 'center',
  },
  celebrationStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  celebrationButton: {
    width: '100%',
  },
  celebrationButtonText: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    textAlign: 'center',
    color: '#FFF',
    fontWeight: '900',
    fontSize: 16,
    borderWidth: 2,
    borderColor: COLORS.text,
    overflow: 'hidden',
  },
  confettiParticle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
