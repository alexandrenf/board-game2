import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { resolveTileImage } from '@/src/game/tileImages';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import { Image } from 'expo-image';
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
    path,
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

  if (!currentTileContent) return null;

  const tileVisual = getTileVisual(currentTileContent.color);
  const imageSource = resolveTileImage({
    imageKey: currentTileContent.imageKey,
    color: currentTileContent.color,
    type: currentTileContent.type,
  });

  const colorKey = currentTileContent.color?.toLowerCase();
  const isRed = colorKey === 'red';
  const isGreen = colorKey === 'green';
  const isYellow = colorKey === 'yellow';
  const tileKind =
    currentTileContent.type === 'start'
      ? 'Início'
      : currentTileContent.type === 'end'
        ? 'Chegada'
        : currentTileContent.type === 'bonus'
          ? 'Bônus'
          : 'Padrão';
  const totalSteps = Math.max(path.length, 1);
  const progressPercent = Math.round((currentTileContent.step / totalSteps) * 100);
  const metadataRows = [
    { label: 'Nome', value: currentTileContent.name },
    { label: 'Posição', value: `Casa ${currentTileContent.step} de ${totalSteps}` },
    { label: 'Progresso', value: `${progressPercent}%` },
    { label: 'Categoria', value: tileVisual.label },
    { label: 'Tipo', value: tileKind },
    { label: 'Cor', value: currentTileContent.color.toUpperCase() },
    { label: 'Efeito padrão', value: tileVisual.effectLabel },
  ];

  const handleDismiss = () => {
    triggerHaptic('light');
    dismissEducationalModal();
  };

  let effectText = 'Sem efeito extra nesta casa.';
  let effectIcon = 'circle-info';
  if (pendingEffect?.advance) {
    effectText = `Ao sair, avance ${pendingEffect.advance} casa${pendingEffect.advance > 1 ? 's' : ''}.`;
    effectIcon = 'arrow-right';
  } else if (pendingEffect?.retreat) {
    effectText = `Ao sair, recue ${pendingEffect.retreat} casa${pendingEffect.retreat > 1 ? 's' : ''}.`;
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
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: modalMaxHeight, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.woodHeader}>
            <View style={styles.woodGrain} pointerEvents="none">
              {Array.from({ length: 4 }).map((_, idx) => (
                <View key={idx} style={[styles.woodGrainLine, { top: 12 + idx * 16 }]} />
              ))}
            </View>
            <View style={[styles.headerBadge, { backgroundColor: tileVisual.base }]}>
              <AppIcon name={tileVisual.icon} size={16} color={COLORS.text} />
              <Text style={styles.headerBadgeText}>{tileVisual.label}</Text>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.headerCloseButton}>
              <AppIcon name="xmark" size={16} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.fabricCard}>
              <View style={styles.imageFrame}>
                <Image source={imageSource} style={styles.image} contentFit="cover" transition={200} />
              </View>
              <Text style={styles.kickerText}>
                {currentTileContent.name} · Casa {currentTileContent.step}
              </Text>
              <Text style={styles.titleText}>
                {currentTileContent.text}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailTitleRow}>
                <AppIcon name="table-list" size={14} color={COLORS.text} />
                <Text style={styles.detailTitle}>Resumo Completo da Casa</Text>
              </View>
              {metadataRows.map((row) => (
                <View key={row.label} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text style={styles.metaValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailTitleRow}>
                <AppIcon name={effectIcon} size={14} color={COLORS.text} />
                <Text style={styles.detailTitle}>Efeito da Casa</Text>
              </View>
              <Text style={styles.detailText}>{effectText}</Text>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailTitleRow}>
                <AppIcon name="list-check" size={14} color={COLORS.text} />
                <Text style={styles.detailTitle}>Instruções</Text>
              </View>
              <Text style={styles.detailText}>
                Leia o conteúdo da casa, confira o efeito e toque em {pendingEffect ? '"Fechar e continuar"' : '"Fechar painel"'} para voltar ao jogo.
              </Text>
            </View>

            {isRed && (
              <View style={[styles.detailCard, styles.riskCard]}>
                <View style={styles.detailTitleRow}>
                  <AppIcon name="triangle-exclamation" size={14} color={COLORS.text} />
                  <Text style={styles.detailTitle}>Atenção</Text>
                </View>
                <Text style={styles.detailText}>
                  Camisinha, testagem e prevenção combinada reduzem riscos de transmissão.
                </Text>
              </View>
            )}

            {isGreen && (
              <View style={[styles.detailCard, styles.preventionCard]}>
                <View style={styles.detailTitleRow}>
                  <AppIcon name="circle-check" size={14} color={COLORS.text} />
                  <Text style={styles.detailTitle}>Boa Prática</Text>
                </View>
                <Text style={styles.detailText}>
                  Você caiu em uma atitude de prevenção. Mantenha este comportamento.
                </Text>
              </View>
            )}

            {isYellow && currentTileContent.type === 'end' && (
              <View style={[styles.detailCard, styles.specialCard]}>
                <View style={styles.detailTitleRow}>
                  <AppIcon name="trophy" size={14} color={COLORS.text} />
                  <Text style={styles.detailTitle}>Conclusão</Text>
                </View>
                <Text style={styles.detailText}>
                  Jornada concluída. Você revisou os principais conceitos de prevenção.
                </Text>
              </View>
            )}

            {!pendingEffect && (
              <View style={[styles.detailCard, styles.neutralCard]}>
                <View style={styles.detailTitleRow}>
                  <AppIcon name="eye" size={14} color={COLORS.text} />
                  <Text style={styles.detailTitle}>Visualização</Text>
                </View>
                <Text style={styles.detailText}>
                  Painel aberto em modo de leitura. Feche quando terminar para voltar ao jogo.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: tileVisual.base }]}
              onPress={handleDismiss}
              activeOpacity={0.9}
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
  woodHeader: {
    height: 76,
    backgroundColor: '#84532F',
    borderBottomWidth: theme.borderWidth.normal,
    borderBottomColor: '#4E2C17',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  woodGrain: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  woodGrainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4E2C17',
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
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    backgroundColor: '#F7EBD9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  fabricCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    padding: 14,
    gap: 12,
    ...theme.shadows.sm,
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
    fontSize: 12,
    fontWeight: '900',
    color: '#7A4E2D',
    letterSpacing: 0.4,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#E3D1B8',
    padding: 14,
    gap: 6,
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
  neutralCard: {
    borderColor: '#D9D1C8',
    backgroundColor: '#F8F5F1',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  detailText: {
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
    borderColor: COLORS.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.sm,
  },
  continueButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
