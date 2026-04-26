import { AppIcon } from '@/src/components/ui/AppIcon';
import { Card3D } from '@/src/components/ui/Card3D';
import { GlassPanel } from '@/src/components/ui/GlassPanel';
import { COLORS } from '@/src/constants/colors';
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
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
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

  useEscapeToClose(handleDismiss, modalVisible && !dismissDisabled);

  const dragOffsetY = useRef(new Animated.Value(0)).current;

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
    onPanResponderGrant: () => {},
    onPanResponderMove: (_, gs) => {
      const dy = gs.dy;
      if (dy > 0) {
        dragOffsetY.setValue(Math.pow(dy, 0.85));
      }
    },
    onPanResponderRelease: (_, gs) => {
      const dy = gs.dy;
      const vy = gs.vy;
      if ((dy > 120 || vy > 0.8) && !dismissDisabled) {
        Animated.timing(dragOffsetY, {
          toValue: 800,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          dismissAction();
          dragOffsetY.setValue(0);
        });
      } else {
        Animated.spring(dragOffsetY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 6,
        }).start();
      }
    },
  }), [dismissDisabled, dismissAction, dragOffsetY]);

  const [sectionReady, setSectionReady] = useState(false);
  useEffect(() => {
    if (modalVisible) {
      const t = setTimeout(() => setSectionReady(true), 250);
      return () => clearTimeout(t);
    } else {
      setSectionReady(false);
    }
  }, [modalVisible]);

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
        <GlassPanel intensity="strong" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Animated.View testID="overlay-educational-modal" style={[styles.backdropTint, { opacity: fadeAnim }]} />
        </GlassPanel>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              height: modalMaxHeight,
              transform: [{ translateY: Animated.add(slideAnim, dragOffsetY) }],
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
            <StaggerSection ready={sectionReady} index={0}>
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
            </StaggerSection>

            <StaggerSection ready={sectionReady} index={1}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="book-open" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Conteúdo educativo</Text>
              </View>
              <Text style={styles.sectionText}>
                {resolvedTileContent.text || 'Sem conteúdo informativo nesta casa.'}
              </Text>
            </View>
            </StaggerSection>

            <StaggerSection ready={sectionReady} index={2}>
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name={effectIcon} size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Efeito</Text>
              </View>
              <Text style={styles.sectionText}>{effectText}</Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="list-check" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Instruções</Text>
              </View>
              <Text style={styles.sectionText}>
                {`Leia o conteúdo da casa, confira o efeito e toque em "${resolvedDismissLabel}" para voltar ao jogo.`}
              </Text>
            </View>
            </StaggerSection>

            {errorMessage ? (
              <StaggerSection ready={sectionReady} index={3}>
              <View style={[styles.sectionCard, styles.errorCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Erro</Text>
                </View>
                <Text style={styles.sectionText}>{errorMessage}</Text>
              </View>
              </StaggerSection>
            ) : null}

            {isRed && (
              <StaggerSection ready={sectionReady} index={4}>
              <View style={[styles.sectionCard, styles.riskCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Atenção</Text>
                </View>
                <Text style={styles.sectionText}>
                  Camisinha, testagem e prevenção combinada reduzem riscos de transmissão.
                </Text>
              </View>
              </StaggerSection>
            )}

            {isGreen && (
              <StaggerSection ready={sectionReady} index={4}>
              <View style={[styles.sectionCard, styles.preventionCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="circle-check" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Boa Prática</Text>
                </View>
                <Text style={styles.sectionText}>
                  Você caiu em uma atitude de prevenção. Mantenha este comportamento.
                </Text>
              </View>
              </StaggerSection>
            )}

            {isYellow && resolvedTileContent.type === 'end' && (
              <StaggerSection ready={sectionReady} index={4}>
              <View style={[styles.sectionCard, styles.specialCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="trophy" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Conclusão</Text>
                </View>
                <Text style={styles.sectionText}>
                  Jornada concluída. Você revisou os principais conceitos de prevenção.
                </Text>
              </View>
              </StaggerSection>
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
      </View>
    </Modal>
  );
};

const StaggerSection: React.FC<{ ready: boolean; index: number; children: React.ReactNode }> = ({ ready, index, children }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => {
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
      }, index * 80);
      return () => clearTimeout(timer);
    } else {
      anim.setValue(0);
    }
  }, [ready, index, anim]);
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#F4EADB',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#4E2C17',
    overflow: 'hidden',
  },
  coloredHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: 'rgba(0,0,0,0.15)',
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
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    backgroundColor: '#F7EBD9',
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
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#E3D1B8',
    padding: 14,
    gap: 8,
  },
  riskCard: {
    borderColor: '#F3B0B0',
    backgroundColor: '#FFF3F3',
  },
  preventionCard: {
    borderColor: '#BDE7C9',
    backgroundColor: '#F2FFF6',
  },
  specialCard: {
    borderColor: '#F0DE9F',
    backgroundColor: '#FFFCEE',
  },
  errorCard: {
    borderColor: '#D8A0A0',
    backgroundColor: '#FFEAEA',
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
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: '#D2B895',
    backgroundColor: '#F4EADB',
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
