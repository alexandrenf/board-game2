import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual, TILE_VISUALS } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const EducationalModal: React.FC = () => {
  const {
    showEducationalModal,
    currentTileContent,
    pendingEffect,
    dismissEducationalModal,
  } = useGameStore();

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showEducationalModal) {
      triggerHaptic('medium');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showEducationalModal, slideAnim, fadeAnim]);

  if (!currentTileContent) return null;

  const tileVisual = getTileVisual(currentTileContent.color);
  const colorKey = currentTileContent.color?.toLowerCase() as keyof typeof TILE_VISUALS;
  const isRed = colorKey === 'red';
  const isGreen = colorKey === 'green';
  const isYellow = colorKey === 'yellow';

  const handleDismiss = () => {
    triggerHaptic('light');
    dismissEducationalModal();
  };

  // Determine effect display
  let effectText = '';
  let effectIcon: string | null = null;
  if (pendingEffect?.advance) {
    effectText = `Avance ${pendingEffect.advance} casas!`;
    effectIcon = 'arrow-right';
  } else if (pendingEffect?.retreat) {
    effectText = `Recue ${pendingEffect.retreat} casas!`;
    effectIcon = 'arrow-left';
  }

  return (
    <Modal
      visible={showEducationalModal}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: fadeAnim },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleDismiss}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Color-coded header bar */}
          <View
            style={[
              styles.headerBar,
              { backgroundColor: tileVisual.base },
            ]}
          >
            <AppIcon name={tileVisual.icon} size={24} color={COLORS.text} />
            <Text style={styles.headerLabel}>{tileVisual.label.toUpperCase()}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.tileText}>{currentTileContent.text}</Text>

            {/* "Você sabia?" education tip for risky behaviors */}
            {isRed && (
              <View style={styles.tipBox}>
                <View style={styles.tipTitleRow}>
                  <AppIcon name="lightbulb" size={18} color={COLORS.text} />
                  <Text style={styles.tipTitle}>VOCÊ SABIA?</Text>
                </View>
                <Text style={styles.tipText}>
                  O uso correto de preservativos e a prevenção combinada são formas eficazes de se proteger.
                </Text>
              </View>
            )}

            {/* Positive reinforcement for prevention actions */}
            {isGreen && (
              <View style={[styles.tipBox, styles.tipBoxGreen]}>
                <View style={styles.tipTitleRow}>
                  <AppIcon name="sparkles" size={18} color={COLORS.text} />
                  <Text style={[styles.tipTitle, styles.tipTitleGreen]}>PARABÉNS!</Text>
                </View>
                <Text style={styles.tipText}>
                  Esta é uma atitude de prevenção! Continue assim.
                </Text>
              </View>
            )}

            {/* Special tile message */}
            {isYellow && currentTileContent.type === 'end' && (
              <View style={[styles.tipBox, styles.tipBoxYellow]}>
                <View style={styles.tipTitleRow}>
                  <AppIcon name="trophy" size={18} color={COLORS.text} />
                  <Text style={[styles.tipTitle, styles.tipTitleYellow]}>VITÓRIA!</Text>
                </View>
                <Text style={styles.tipText}>
                  Você completou o jogo e está bem informado sobre prevenção!
                </Text>
              </View>
            )}
          </View>

          {/* Effect indicator */}
          {effectText && (
            <View
              style={[
                styles.effectBar,
                isRed ? styles.effectBarRed : styles.effectBarGreen,
              ]}
            >
              {effectIcon && (
                <AppIcon name={effectIcon} size={16} color="#FFF" style={styles.effectIcon} />
              )}
              <Text style={styles.effectText}>{effectText}</Text>
            </View>
          )}

          {/* Continue button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: tileVisual.base },
            ]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>CONTINUAR</Text>
            <AppIcon name="arrow-right" size={14} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1.5,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  tileText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
    textAlign: 'center',
  },
  tipBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FED7D7',
  },
  tipBoxGreen: {
    backgroundColor: '#F0FFF4',
    borderColor: '#C6F6D5',
  },
  tipBoxYellow: {
    backgroundColor: '#FFFFF0',
    borderColor: '#FAF089',
  },
  tipTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#C53030',
    letterSpacing: 1,
    marginBottom: 0,
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipTitleGreen: {
    color: '#276749',
  },
  tipTitleYellow: {
    color: '#975A16',
  },
  tipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  effectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  effectBarRed: {
    backgroundColor: '#FED7D7',
  },
  effectBarGreen: {
    backgroundColor: '#C6F6D5',
  },
  effectIcon: {
    marginRight: 4,
  },
  effectText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
});
