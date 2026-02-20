import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { resolveTileImage } from '@/src/game/tileImages';
import { getTileName } from '@/src/game/tileNaming';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef } from 'react';
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

const formatMetaLabel = (rawKey: string): string => {
  if (rawKey === 'timeLimitHours') return 'Janela de tempo';
  const withSpaces = rawKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!withSpaces) return 'Meta';
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

const formatMetaValue = (value: unknown): string => {
  if (typeof value === 'number') return `${value}`;
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '-';
};

export const EducationalModal: React.FC = () => {
  const {
    showEducationalModal,
    currentTileContent,
    pendingEffect,
    path,
    focusTileIndex,
    playerIndex,
    dismissEducationalModal,
  } = useGameStore();

  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalMaxHeight = Math.min(height - insets.top - 10, height * 0.92);

  const slideAnim = useRef(new Animated.Value(420)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showEducationalModal) {
      triggerHaptic('medium');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
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
    ]).start();
  }, [fadeAnim, showEducationalModal, slideAnim]);

  const resolvedTileContent = useMemo(() => {
    if (currentTileContent) return currentTileContent;
    if (path.length === 0) return null;

    const preferredIndex = focusTileIndex >= 0 ? focusTileIndex : playerIndex;
    const clampedIndex = Math.max(0, Math.min(preferredIndex, path.length - 1));
    const tile = path[clampedIndex];
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
  }, [currentTileContent, focusTileIndex, path, playerIndex]);

  if (!resolvedTileContent) return null;

  const tileVisual = getTileVisual(resolvedTileContent.color);
  const imageSource = resolveTileImage({
    imageKey: resolvedTileContent.imageKey,
    color: resolvedTileContent.color,
    type: resolvedTileContent.type,
  });

  const colorKey = resolvedTileContent.color?.toLowerCase();
  const isRed = colorKey === 'red';
  const isGreen = colorKey === 'green';
  const isYellow = colorKey === 'yellow';

  const totalSteps = Math.max(path.length, 1);
  const progressPercent = Math.round((resolvedTileContent.step / totalSteps) * 100);

  const metadataRows = [
    { label: 'Posicao', value: `Casa ${resolvedTileContent.step} de ${totalSteps}` },
    { label: 'Progresso', value: `${progressPercent}%` },
    { label: 'Categoria', value: tileVisual.label },
    { label: 'Efeito padrao', value: tileVisual.effectLabel },
    ...Object.entries(resolvedTileContent.meta ?? {}).map(([key, value]) => ({
      label: formatMetaLabel(key),
      value: key === 'timeLimitHours' && typeof value === 'number' ? `${value} horas` : formatMetaValue(value),
    })),
  ];

  const handleDismiss = () => {
    triggerHaptic('light');
    dismissEducationalModal();
  };

  const appliedEffect = pendingEffect ?? resolvedTileContent.effect ?? null;

  let effectText = 'Sem efeito extra nesta casa.';
  let effectIcon = 'circle-info';
  if (appliedEffect?.advance) {
    effectText = `Ao sair, avance ${appliedEffect.advance} casa${appliedEffect.advance > 1 ? 's' : ''}.`;
    effectIcon = 'arrow-right';
  } else if (appliedEffect?.retreat) {
    effectText = `Ao sair, recue ${appliedEffect.retreat} casa${appliedEffect.retreat > 1 ? 's' : ''}.`;
    effectIcon = 'arrow-left';
  }

  return (
    <Modal
      visible={showEducationalModal}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <Animated.View testID="overlay-educational-modal" style={[styles.backdrop, { opacity: fadeAnim }]} />

        <Animated.View
          style={[
            styles.sheet,
            {
              height: modalMaxHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.floatingCloseButton}
            accessibilityRole="button"
            accessibilityLabel="Fechar informacoes da casa"
          >
            <AppIcon name="xmark" size={16} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={[styles.headerBadge, { backgroundColor: tileVisual.base }]}>
                  <AppIcon name={tileVisual.icon} size={14} color={COLORS.text} />
                  <Text style={styles.headerBadgeText}>Cor: {tileVisual.label}</Text>
                </View>
                <Text style={styles.heroProgressText}>Casa {resolvedTileContent.step} de {totalSteps}</Text>
              </View>

              <View style={styles.imageFrame}>
                <Image source={imageSource} style={styles.image} contentFit="cover" transition={200} />
              </View>

              <Text style={styles.kickerText}>
                {resolvedTileContent.name}
              </Text>
              <Text style={styles.titleText}>
                {resolvedTileContent.text || 'Sem conteudo informativo nesta casa.'}
              </Text>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="table-list" size={14} color={COLORS.text} />
                <Text style={styles.sectionTitle}>Detalhes</Text>
              </View>
              {metadataRows.map((row) => (
                <View key={row.label} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text style={styles.metaValue}>{row.value}</Text>
                </View>
              ))}
            </View>

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
                <Text style={styles.sectionTitle}>Instrucoes</Text>
              </View>
              <Text style={styles.sectionText}>
                Leia o conteudo da casa, confira o efeito e toque em{' '}
                {pendingEffect ? '"Fechar e continuar"' : '"Fechar painel"'} para voltar ao jogo.
              </Text>
            </View>

            {isRed && (
              <View style={[styles.sectionCard, styles.riskCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Atencao</Text>
                </View>
                <Text style={styles.sectionText}>
                  Camisinha, testagem e prevencao combinada reduzem riscos de transmissao.
                </Text>
              </View>
            )}

            {isGreen && (
              <View style={[styles.sectionCard, styles.preventionCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="circle-check" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Boa Pratica</Text>
                </View>
                <Text style={styles.sectionText}>
                  Voce caiu em uma atitude de prevencao. Mantenha este comportamento.
                </Text>
              </View>
            )}

            {isYellow && resolvedTileContent.type === 'end' && (
              <View style={[styles.sectionCard, styles.specialCard]}>
                <View style={styles.sectionTitleRow}>
                  <AppIcon name="trophy" size={14} color={COLORS.text} />
                  <Text style={styles.sectionTitle}>Conclusao</Text>
                </View>
                <Text style={styles.sectionText}>
                  Jornada concluida. Voce revisou os principais conceitos de prevencao.
                </Text>
              </View>
            )}

            <View style={{ height: Math.max(insets.bottom + 86, 100) }} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
            <TouchableOpacity
              testID="btn-close-educational-modal"
              style={styles.continueButton}
              onPress={handleDismiss}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={pendingEffect ? 'Fechar e continuar' : 'Fechar painel'}
            >
              <Text style={styles.continueButtonText}>{pendingEffect ? 'Fechar e continuar' : 'Fechar painel'}</Text>
              <AppIcon name="arrow-right" size={14} color={COLORS.text} />
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
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  sheet: {
    backgroundColor: '#F4EADB',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#4E2C17',
    overflow: 'hidden',
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
  kickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.2,
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
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFE3D4',
    paddingTop: 8,
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7A4E2D',
    letterSpacing: 0.3,
  },
  metaValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: '#D2B895',
    backgroundColor: '#F4EADB',
  },
  continueButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#8A6744',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.sm,
  },
  continueButtonText: {
    color: '#5B351E',
    fontSize: 14,
    fontWeight: '800',
  },
});
