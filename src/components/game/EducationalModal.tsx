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
import { QuizReviewData, QuizReviewSection } from './QuizReviewSection';

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
  /** Post-answer review content. When set, embeds the quiz review block and the result pill. */
  quizReview?: QuizReviewData | null;
};

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
    const delay = index * 90;
    const timeout = setTimeout(() => {
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: false,
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

const formatRiskLabel = (color: string | undefined): { label: string; tone: 'risk' | 'safe' | 'neutral' } => {
  switch (color) {
    case 'red':
      return { label: 'Sim', tone: 'risk' };
    case 'green':
      return { label: 'Não — prevenção', tone: 'safe' };
    case 'blue':
      return { label: 'Não', tone: 'safe' };
    case 'yellow':
      return { label: 'Especial', tone: 'neutral' };
    default:
      return { label: '—', tone: 'neutral' };
  }
};

const formatResultLabel = (
  result: QuizReviewData['result'] | undefined,
): { label: string; tone: 'positive' | 'negative' | 'neutral'; icon: 'circle-check' | 'circle-xmark' | 'hourglass-end' } => {
  if (result === 'correct') return { label: 'Acertou', tone: 'positive', icon: 'circle-check' };
  if (result === 'incorrect') return { label: 'Errou', tone: 'negative', icon: 'circle-xmark' };
  if (result === 'timeout') return { label: 'Tempo esgotado', tone: 'negative', icon: 'hourglass-end' };
  return { label: '—', tone: 'neutral', icon: 'circle-check' };
};

/** Modal that shows the tile details and (when provided) the quiz review embedded inline. */
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
  quizReview,
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
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: false,
          tension: 65,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }),
      ]).start(() => {
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 420,
        duration: 190,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(contentFadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
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
      supportText: tile.supportText,
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
    () => (resolvedTileContent ? getTileVisual(resolvedTileContent.color) : null),
    [resolvedTileContent],
  );
  const imageSource = useMemo(
    () =>
      resolvedTileContent
        ? resolveTileImage({
            imageKey: resolvedTileContent.imageKey,
            color: resolvedTileContent.color,
            type: resolvedTileContent.type,
          })
        : null,
    [resolvedTileContent],
  );

  const colorKey = resolvedTileContent?.color?.toLowerCase();
  const isRed = colorKey === 'red';
  const isGreen = colorKey === 'green';
  const isYellow = colorKey === 'yellow';
  const totalSteps = resolvedTileContent
    ? Math.max(resolvedPath.length, resolvedTileContent.step, 1)
    : 0;
  const tileLabel = useMemo(() => {
    if (!resolvedTileContent) return '';
    const m = resolvedTileContent.meta;
    if (typeof m?.label === 'string') return m.label;
    if (typeof m?.name === 'string') return m.name;
    if (typeof resolvedTileContent.name === 'string') return resolvedTileContent.name;
    return 'Sem título';
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
    { useNativeDriver: false },
  );
  const handleDragEnd = useCallback(
    (e: { nativeEvent: { translationY: number; velocityY: number; state: number } }) => {
      if (e.nativeEvent.state === State.END) {
        if (!dismissDisabled && (e.nativeEvent.translationY > 120 || e.nativeEvent.velocityY > 800)) {
          handleDismiss();
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 8 }).start();
      }
    },
    [dismissDisabled, dragY, handleDismiss],
  );

  const resolvedDismissLabel =
    dismissLabel ?? (resolvedPendingEffect ? 'Fechar e continuar' : 'Fechar painel');

  const risk = useMemo(() => formatRiskLabel(colorKey), [colorKey]);
  const resultMeta = useMemo(
    () => formatResultLabel(quizReview?.result),
    [quizReview?.result],
  );

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
              <View style={[styles.topBar, { backgroundColor: tileVisual.base }]}>
                <View style={styles.topBarSide}>
                  <AppIcon name={tileVisual.icon} size={13} color={COLORS.text} />
                  <Text style={styles.topBarText}>{tileVisual.label.toUpperCase()}</Text>
                </View>
                {quizReview ? (
                  <View
                    style={[
                      styles.resultPill,
                      resultMeta.tone === 'positive'
                        ? styles.resultPillPositive
                        : resultMeta.tone === 'negative'
                          ? styles.resultPillNegative
                          : styles.resultPillNeutral,
                    ]}
                  >
                    <AppIcon name={resultMeta.icon} size={11} color={COLORS.text} />
                    <Text style={styles.resultPillText}>{resultMeta.label.toUpperCase()}</Text>
                  </View>
                ) : null}
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
                  contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: Math.max(insets.bottom + 96, 110) },
                  ]}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <StaggeredSection index={0} visible={modalVisible}>
                    <View style={styles.headerBlock}>
                      {themeTitle ? <Text style={styles.themeTitle}>{themeTitle}</Text> : null}
                      <Text style={styles.tileTitle}>{tileLabel}</Text>

                      <View style={styles.twoColumn}>
                        <View style={styles.imageColumn}>
                          <View style={styles.imageFrame}>
                            <Image
                              source={imageSource}
                              style={styles.image}
                              contentFit="cover"
                              transition={200}
                            />
                          </View>
                        </View>

                        <View style={styles.metaColumn}>
                          <MetaRow label="Casa" value={`${resolvedTileContent.step} / ${totalSteps}`} />
                          <MetaRow label="Categoria" value={tileVisual.label} />
                          <MetaRow
                            label="Fator de risco"
                            value={risk.label}
                            tone={risk.tone === 'risk' ? 'negative' : risk.tone === 'safe' ? 'positive' : 'neutral'}
                          />
                          {quizReview ? (
                            <MetaRow
                              label="Resultado"
                              value={resultMeta.label}
                              tone={resultMeta.tone}
                              icon={resultMeta.icon}
                            />
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </StaggeredSection>

                  <StaggeredSection index={1} visible={modalVisible}>
                    <View style={styles.aboutBlock}>
                      <Text style={styles.sectionLabel}>Sobre esta casa</Text>
                      <Text style={styles.bodyText}>
                        {resolvedTileContent.supportText ||
                          resolvedTileContent.text ||
                          'Sem conteúdo informativo nesta casa.'}
                      </Text>

                      {isRed ? (
                        <View style={styles.accentRow}>
                          <AppIcon name="triangle-exclamation" size={13} color="#7A2424" />
                          <Text style={styles.accentText}>
                            Camisinha, testagem e prevenção combinada reduzem riscos de transmissão.
                          </Text>
                        </View>
                      ) : null}
                      {isGreen ? (
                        <View style={styles.accentRow}>
                          <AppIcon name="circle-check" size={13} color="#1B6F3A" />
                          <Text style={styles.accentText}>
                            Boa prática! Mantenha esse comportamento de prevenção.
                          </Text>
                        </View>
                      ) : null}
                      {isYellow && resolvedTileContent.type === 'end' ? (
                        <View style={styles.accentRow}>
                          <AppIcon name="trophy" size={13} color="#7A5B0F" />
                          <Text style={styles.accentText}>
                            Jornada concluída. Você revisou os principais conceitos de prevenção.
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </StaggeredSection>

                  {quizReview ? (
                    <StaggeredSection index={2} visible={modalVisible}>
                      <View style={styles.reviewWrap}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewHeaderLine} />
                          <Text style={styles.reviewHeaderText}>REVISÃO DO QUIZ</Text>
                          <View style={styles.reviewHeaderLine} />
                        </View>
                        <QuizReviewSection review={quizReview} />
                      </View>
                    </StaggeredSection>
                  ) : null}

                  {errorMessage ? (
                    <View style={styles.errorCard}>
                      <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  ) : null}
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

type MetaRowProps = {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
  icon?: 'circle-check' | 'circle-xmark' | 'hourglass-end';
};

const MetaRow: React.FC<MetaRowProps> = ({ label, value, tone = 'neutral', icon }) => {
  const valueColor =
    tone === 'positive' ? '#1B6F3A' : tone === 'negative' ? '#7A2424' : COLORS.text;
  return (
    <View style={metaStyles.row}>
      <Text style={metaStyles.label}>{label}</Text>
      <View style={metaStyles.valueRow}>
        {icon ? <AppIcon name={icon} size={12} color={valueColor} /> : null}
        <Text style={[metaStyles.value, { color: valueColor }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const metaStyles = StyleSheet.create({
  row: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
});

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
    backgroundColor: 'rgba(252, 246, 235, 0.97)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: theme.borderWidth.normal,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  topBarSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topBarText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 2,
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  resultPillPositive: {
    backgroundColor: 'rgba(189, 231, 201, 0.85)',
    borderColor: 'rgba(56, 161, 105, 0.6)',
  },
  resultPillNegative: {
    backgroundColor: 'rgba(243, 176, 176, 0.85)',
    borderColor: 'rgba(176, 60, 60, 0.55)',
  },
  resultPillNeutral: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderColor: 'rgba(0,0,0,0.18)',
  },
  resultPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1.2,
  },
  floatingCloseButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GLASS.border,
    backgroundColor: 'rgba(255,255,255,0.6)',
    zIndex: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 22,
  },
  headerBlock: {
    gap: 12,
  },
  themeTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  tileTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: COLORS.text,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  imageColumn: {
    flex: 1.05,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    backgroundColor: '#F0E2CF',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  metaColumn: {
    flex: 1,
    gap: 2,
  },
  aboutBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '600',
    color: COLORS.text,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 4,
  },
  accentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewWrap: {
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  reviewHeaderText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 234, 234, 0.85)',
    borderColor: 'rgba(216,160,160,0.7)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
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
