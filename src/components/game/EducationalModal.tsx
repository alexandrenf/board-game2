import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual, TILE_VISUALS } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const EducationalModal: React.FC = () => {
  const {
    showEducationalModal,
    currentTileContent,
    pendingEffect,
    dismissEducationalModal,
  } = useGameStore();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.min(height - insets.top - 16, height * 0.86);

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
            { maxHeight: modalMaxHeight },
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

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Content */}
            <View style={styles.content}>
              <View style={styles.tileSummaryRow}>
                <View style={styles.tileBadge}>
                  <AppIcon name={tileVisual.icon} size={16} color={COLORS.text} />
                  <View>
                    <Text style={styles.tileBadgeLabel}>{tileVisual.label.toUpperCase()}</Text>
                    <Text style={styles.tileBadgeSub}>{tileVisual.effectLabel}</Text>
                  </View>
                </View>
                {effectText && (
                  <View
                    style={[
                      styles.effectPill,
                      isRed ? styles.effectPillRed : styles.effectPillGreen,
                    ]}
                  >
                    {effectIcon && (
                      <AppIcon name={effectIcon} size={12} color="#FFF" />
                    )}
                    <Text style={styles.effectPillText}>{effectText}</Text>
                  </View>
                )}
              </View>

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
                    <AppIcon name="wand-magic-sparkles" size={18} color={COLORS.text} />
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
          </ScrollView>

          <View style={[styles.buttonDock, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
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
          </View>
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
    backgroundColor: '#FFFCF8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  contentScroll: {
    flex: 1,
  },
  contentScrollContent: {
    paddingBottom: 4,
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
  tileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E4D7',
    flex: 1,
  },
  tileBadgeLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  tileBadgeSub: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tileText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 26,
    textAlign: 'center',
  },
  effectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  effectPillRed: { backgroundColor: '#F8A5A5' },
  effectPillGreen: { backgroundColor: '#9AE6B4' },
  effectPillText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
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
  buttonDock: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#F0E4D7',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
});
