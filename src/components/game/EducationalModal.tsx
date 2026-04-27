import { AppIcon } from '@/src/components/ui/AppIcon';
import { Card3D } from '@/src/components/ui/Card3D';
import { GlassPanel } from '@/src/components/ui/GlassPanel';
import { COLORS, GLASS } from '@/src/constants/colors';
import { TileEffect } from '@/src/domain/game/types';
import { getTileVisual } from '@/src/game/constants';
import { Tile, TileContent, useGameStore } from '@/src/game/state/gameState';
import { resolveTileImage } from '@/src/game/tileImages';
import { getTileName } from '@/src/game/tileNaming';
import { useEscapeToClose } from '@/src/hooks/useEscapeToClose';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Props for the {@link EducationalModal} component. */
type EducationalModalProps = {
  visible?: boolean;
  content?: TileContent | null;
  pendingEffect?: TileEffect | null;
  path?: Tile[];
  focusTileIndex?: number;
  playerIndex?: number;
  onDismiss?: () => void;
  dismissLabel?: string;
  dismissDisabled?: boolean;
  errorMessage?: string | null;
  openDelayMs?: number;
};

/** Modal that displays educational tile content, effects, and contextual guidance. */
/** Animated section that fades and slides up with a staggered delay based on index. */
const StaggeredSection: React.FC<{ index: number; visible: boolean; children: React.ReactNode }> = ({
  index,
  visible,
  children,
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    const delay = index * 80;
    const timeout = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, [anim, index, visible]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
};

export const EducationalModal: React.FC<EducationalModalProps> = ({
  visible,
  content,
  pendingEffect,
  path,
  focusTileIndex,
  playerIndex,
  onDismiss,
  dismissLabel,
  dismissDisabled = false,
  errorMessage,
  openDelayMs,
}) => {
  const storeShowEducationalModal = useGameStore((s) => s.showEducationalModal);
  const storeEducationalModalDelayMs = useGameStore((s) => s.educationalModalDelayMs);
  const storeCurrentTileContent = useGameStore((s) => s.currentTileContent);
  const storePendingEffect = useGameStore((s) => s.pendingEffect);
  const storePath = useGameStore((s) => s.path);
  const storeFocusTileIndex = useGameStore((s) => s.focusTileIndex);
  const storePlayerIndex = useGameStore((s) => s.playerIndex);
  const storeDismissEducationalModal = useGameStore((s) => s.dismissEducationalModal);
  const resolvedVisible = visible ?? storeShowEducationalModal;
  const resolvedOpenDelayMs = openDelayMs ?? storeEducationalModalDelayMs ?? 0;
  const resolvedPendingEffect = pendingEffect ?? storePendingEffect;
  const resolvedPath = path ?? storePath;
  const resolvedFocusTileIndex = focusTileIndex ?? storeFocusTileIndex;
  const resolvedPlayerIndex = playerIndex ?? storePlayerIndex;
  const dismissAction = onDismiss ?? storeDismissEducationalModal;

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.min(height - insets.top - 10, height * 0.92);

  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const delayedVisibleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modalVisible, setModalVisible] = useState(resolvedVisible && resolvedOpenDelayMs <= 0);

  useEffect(() => {
    if (delayedVisibleTimeoutRef.current) {
      clearTimeout(delayedVisibleTimeoutRef.current);
      delayedVisibleTimeoutRef.current = null;
    }

    if (!resolvedVisible) {
      setModalVisible(false);
      return;
    }

    if (resolvedOpenDelayMs <= 0) {
      setModalVisible(true);
      return;
    }

    setModalVisible(false);
    delayedVisibleTimeoutRef.current = setTimeout(() => {
      delayedVisibleTimeoutRef.current = null;
      setModalVisible(true);
    }, resolvedOpenDelayMs);

    return () => {
      if (delayedVisibleTimeoutRef.current) {
        clearTimeout(delayedVisibleTimeoutRef.current);
        delayedVisibleTimeoutRef.current = null;
      }
    };
  }, [resolvedOpenDelayMs, resolvedVisible]);

  useEffect(() => {
    if (modalVisible) {
      triggerHaptic('medium');
      contentFadeAnim.setValue(0);
      // Phase 1: Container slides in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 2: Content fades in after container arrives
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 420,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentFadeAnim, fadeAnim, modalVisible, slideAnim]);

  const resolvedTileContent = useMemo(() => {
    if (content) return content;
    if (storeCurrentTileContent) return storeCurrentTileContent;
    if (resolvedPath.length === 0) return null;

    const preferredIndex =
      resolvedFocusTileIndex >= 0 ? resolvedFocusTileIndex : resolvedPlayerIndex;
    const clampedIndex = Math.max(0, Math.min(preferredIndex, resolvedPath.length - 1));
    const tile = resolvedPath[clampedIndex];
    if (!tile) return null;

    return {
      name: getTileName(tile, clampedIndex),
      step: clampedIndex + 1,
      text: tile.text ?? '',
      color: tile.color ?? 'blue',
      imageKey: tile.imageKey,
      type: tile.type,
      effect: tile.effect ?? null,
      meta: tile.meta,
    };
  }, [
    content,
    resolvedFocusTileIndex,
    resolvedPath,
    resolvedPlayerIndex,
    storeCurrentTileContent,
  ]);

  const tileVisual = useMemo(
    () => resolvedTileContent ? getTileVisual(resolvedTileContent.color) : null,
    [resolvedTileContent],
  );
  const imageSource = useMemo(
    () => resolvedTileContent
      ? resolveTileImage({ imageKey: resolvedTileContent.imageKey, color: resolvedTileContent.color, type: resolvedTileContent.type })
      : null,
    [resolvedTileContent],
  );

  const colorKey = resolvedTileContent?.color?.toLowerCase();
  const isRed = colorKey === 'red';
  const isGreen = colorKey === 'green';
  const isYellow = colorKey === 'yellow';
  const totalSteps = resolvedTileContent ? Math.max(resolvedPath.length, resolvedTileContent.step, 1) : 0;
  const tileLabel = useMemo(() => {
    if (!resolvedTileContent) return '';
    const m = resolvedTileContent.meta;
    if (typeof m?.label === 'string') return m.label;
    if (typeof m?.name === 'string') return m.name;
    if (typeof resolvedTileContent.name === 'string') return resolvedTileContent.name;
    return 'Sem titulo';
  }, [resolvedTileContent]);
  const themeTitle = useMemo(() => {
    if (!resolvedTileContent) return null;
    const m = resolvedTileContent.meta;
    return typeof m?.themeTitle === 'string' ? m.themeTitle : null;
  }, [resolvedTileContent]);

  const handleDismiss = useCallback(() => {
    triggerHaptic('light');
    dismissAction();
  }, [dismissAction]);

  useEscapeToClose(handleDismiss, resolvedVisible && !dismissDisabled);

  const dragY = useRef(new Animated.Value(0)).current;
  const handleDragEvent = Animated.event(
    [{ nativeEvent: { translationY: dragY } }],
    { useNativeDriver: true },
  );
  const handleDragEnd = useCallback(
    (e: { nativeEvent: { translationY: number; velocityY: number; state: number } }) => {
      if (e.nativeEvent.state === State.END) {
        if (!dismissDisabled && (e.nativeEvent.translationY > 120 || e.nativeEvent.velocityY > 800)) {
          handleDismiss();
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
      }
    },
    [dismissDisabled, dragY, handleDismiss],
  );

  const appliedEffect = (resolvedPendingEffect ?? resolvedTileContent?.effect) ?? null;
  const resolvedDismissLabel =
    dismissLabel ?? (resolvedPendingEffect ? 'Fechar e continuar' : 'Fechar painel');

  const { effectText, effectIcon } = useMemo(() => {
    if (appliedEffect?.advance) {
      return {
        effectText: `Ao sair, avance ${appliedEffect.advance} casa${appliedEffect.advance > 1 ? 's' : ''}.`,
        effectIcon: 'arrow-right' as const,
      };
    }
    if (appliedEffect?.retreat) {
      return {
        effectText: `Ao sair, recue ${appliedEffect.retreat} casa${appliedEffect.retreat > 1 ? 's' : ''}.`,
        effectIcon: 'arrow-left' as const,
      };
    }
    return { effectText: 'Sem efeito extra nesta casa.', effectIcon: 'circle-info' as const };
  }, [appliedEffect]);

  if (!resolvedTileContent || !tileVisual || !imageSource) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Animated.View testID="overlay-educational-modal" style={[styles.backdrop, { opacity: fadeAnim }]}>
          <GlassPanel intensity="strong" radius={0} style={StyleSheet.absoluteFillObject} />
          <View style={styles.backdropTint} />
        </Animated.View>

        <GestureHandlerRootView style={styles.gestureRoot}>
        <PanGestureHandler
          onGestureEvent={handleDragEvent}
          onHandlerStateChange={handleDragEnd}
          enabled={!dismissDisabled}
        >
        <Animated.View
          style={[
            styles.sheet,
            {
              height: modalMaxHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Colored header bar matching tile type */}
          <View style={[styles.coloredHeaderBar, { backgroundColor: tileVisual.base }]}>
            <AppIcon name={tileVisual.icon} size={12} color={COLORS.text} />
            <Text style={styles.coloredHeaderText}>{tileVisual.label.toUpperCase()}</Text>
          </View>

          <TouchableOpacity
            onPress={handleDismiss}
            disabled={dismissDisabled}
            style={styles.floatingCloseButton}
            accessibilityRole="button"
            accessibilityLabel="Fechar informações da casa"
          >
            <AppIcon name="xmark" size={16} color={COLORS.text} />
          </TouchableOpacity>

          <Animated.View style={{ flex: 1, opacity: contentFadeAnim }}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <StaggeredSection index={0} visible={modalVisible}>
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={[styles.headerBadge, { backgroundColor: tileVisual.base }]}>
                  <AppIcon name={tileVisual.icon} size={14} color={COLORS.text} />
                  <Text style={styles.headerBadgeText}>{tileVisual.label}</Text>
                </View>
              </View>

              <View style={styles.imageFrame}>
                <Image source={imageSource} style={styles.image} contentFit="cover" transition={200} />
              </View>

              <Text style={styles.heroProgressText}>
                Casa {resolvedTileContent.step} de {totalSteps}
              </Text>

              {themeTitle ? <Text style={styles.themeText}>{themeTitle}</Text> : null}

              <Text style={styles.titleText}>{tileLabel}</Text>
            </View>
            </StaggeredSection>

            <StaggeredSection index={1} visible={modalVisible}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="book-open" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Conteúdo educativo</Text>
              </View>
              <Text style={styles.sectionText}>
                {resolvedTileContent.text || 'Sem conteúdo informativo nesta casa.'}
              </Text>
            </View>
            </StaggeredSection>

            <StaggeredSection index={2} visible={modalVisible}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name={effectIcon} size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Efeito</Text>
              </View>
              <Text style={styles.sectionText}>{effectText}</Text>
            </View>
            </StaggeredSection>

            <StaggeredSection index={3} visible={modalVisible}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="list-check" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Instruções</Text>
              </View>
              <Text style={styles.sectionText}>
                {`Leia o conteúdo da casa, confira o efeito e toque em "${resolvedDismissLabel}" para voltar ao jogo.`}
              </Text>
            </View>
            </StaggeredSection>

            {errorMessage ? (
              <View style={[styles.sectionCard, styles.errorCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Erro</Text>
                </View>
                <Text style={styles.sectionText}>{errorMessage}</Text>
              </View>
            ) : null}

            {isRed && (
              <View style={[styles.sectionCard, styles.riskCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Atenção</Text>
                </View>
                <Text style={styles.sectionText}>
                  Camisinha, testagem e prevenção combinada reduzem riscos de transmissão.
                </Text>
              </View>
            )}

            {isGreen && (
              <View style={[styles.sectionCard, styles.preventionCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="circle-check" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Boa Prática</Text>
                </View>
                <Text style={styles.sectionText}>
                  Você caiu em uma atitude de prevenção. Mantenha este comportamento.
                </Text>
              </View>
            )}

            {isYellow && resolvedTileContent.type === 'end' && (
              <View style={[styles.sectionCard, styles.specialCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="trophy" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Conclusão</Text>
                </View>
                <Text style={styles.sectionText}>
                  Jornada concluída. Você revisou os principais conceitos de prevenção.
                </Text>
              </View>
            )}

            <View style={{ height: Math.max(insets.bottom + 86, 100) }} />
          </ScrollView>
          </Animated.View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
            <Card3D
              testID="btn-close-educational-modal"
              height={52}
              borderRadius={14}
              theme="orange"
              depth={6}
              haptic={false}
              onPress={handleDismiss}
              disabled={dismissDisabled}
              accessibilityLabel={resolvedDismissLabel}
            >
              <View style={styles.continueButtonInner}>
                <Text style={styles.continueButtonText}>{resolvedDismissLabel}</Text>
                <AppIcon name="arrow-right" size={14} color="#FFF" />
              </View>
            </Card3D>
          </View>
        </Animated.View>
        </PanGestureHandler>
        </GestureHandlerRootView>
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
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gestureRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(244, 234, 219, 0.88)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: theme.borderWidth.normal,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  coloredHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
  },
  coloredHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS.border,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS.border,
    padding: 14,
    gap: 12,
    ...theme.shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  heroProgressText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#7A4E2D',
    letterSpacing: 0.2,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    backgroundColor: '#F0E2CF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    color: COLORS.text,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    padding: 14,
    gap: 8,
  },
  riskCard: {
    borderColor: 'rgba(243,176,176,0.7)',
    backgroundColor: 'rgba(255,243,243,0.75)',
  },
  preventionCard: {
    borderColor: 'rgba(189,231,201,0.7)',
    backgroundColor: 'rgba(242,255,246,0.75)',
  },
  specialCard: {
    borderColor: 'rgba(240,222,159,0.7)',
    backgroundColor: 'rgba(255,252,238,0.75)',
  },
  errorCard: {
    borderColor: 'rgba(216,160,160,0.7)',
    backgroundColor: 'rgba(255,234,234,0.75)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    color: COLORS.text,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(244, 234, 219, 0.7)',
  },
  continueButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
