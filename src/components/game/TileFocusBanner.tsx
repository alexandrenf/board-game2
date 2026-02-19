import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { getTileVisual } from '@/src/game/constants';
import { Tile } from '@/src/game/state/gameState';
import { resolveTileImage } from '@/src/game/tileImages';
import { theme } from '@/src/styles/theme';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type TileFocusBannerProps = {
  tile?: Tile;
  focusIndex: number;
  totalSteps: number;
  progress: number;
  isMoving: boolean;
};

export const TileFocusBanner: React.FC<TileFocusBannerProps> = ({
  tile,
  focusIndex,
  totalSteps,
  progress,
  isMoving,
}) => {
  const tileVisual = getTileVisual(tile?.color);
  const imageSource = resolveTileImage({
    imageKey: tile?.imageKey,
    color: tile?.color,
    type: tile?.type,
  });

  const safeStep = Math.min(focusIndex + 1, totalSteps || 1);

  return (
    <View style={styles.frame}>
      <View style={styles.grainLayer} pointerEvents="none">
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={idx} style={[styles.grainLine, { top: 8 + idx * 20 }]} />
        ))}
      </View>

      <View style={styles.fabricPanel}>
        <View style={[styles.statusBadge, { backgroundColor: tileVisual.base }]}>
          <AppIcon name={isMoving ? 'shoe-prints' : tileVisual.icon} size={12} color={COLORS.text} />
          <Text style={styles.statusBadgeText}>{isMoving ? 'Em deslocamento' : tileVisual.label}</Text>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.imageFrame}>
            <Image source={imageSource} style={styles.image} contentFit="cover" transition={180} />
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.stepLabel}>
              Casa {safeStep} de {Math.max(totalSteps, 1)}
            </Text>
            <Text style={styles.headline} numberOfLines={2}>
              {tile?.text || 'Avance pelo tabuleiro para descobrir cada conteúdo.'}
            </Text>
            <Text style={styles.subLabel} numberOfLines={1}>
              {tileVisual.effectLabel}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 100))}%` }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: theme.borderWidth.normal,
    borderColor: '#4E2C17',
    backgroundColor: '#8A5A34',
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  grainLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  grainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#5B351E',
  },
  fabricPanel: {
    margin: 8,
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: '#D2B895',
    backgroundColor: '#F7EBD9',
    padding: 8,
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.text,
    maxWidth: 170,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  imageFrame: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
    backgroundColor: '#FFF7EC',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textColumn: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
    gap: 2,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5B351E',
    letterSpacing: 0.4,
  },
  headline: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 19,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E5D5BF',
    borderWidth: theme.borderWidth.thin,
    borderColor: '#B78D5F',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C66B27',
  },
});

