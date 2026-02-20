import { AppIcon } from "@/src/components/ui/AppIcon";
import { COLORS } from "@/src/constants/colors";
import { getTileVisual } from "@/src/game/constants";
import { Tile } from "@/src/game/state/gameState";
import { resolveTileImage } from "@/src/game/tileImages";
import { theme } from "@/src/styles/theme";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type TileFocusBannerProps = {
  tile?: Tile;
  focusIndex: number;
  totalSteps: number;
  progress: number;
  isMoving: boolean;
  roamMode: boolean;
};

export const TileFocusBanner: React.FC<TileFocusBannerProps> = ({
  tile,
  focusIndex,
  totalSteps,
  progress,
  isMoving,
  roamMode,
}) => {
  const tileVisual = getTileVisual(tile?.color);
  const imageSource = resolveTileImage({
    imageKey: tile?.imageKey,
    color: tile?.color,
    type: tile?.type,
  });

  const safeStep = Math.min(focusIndex + 1, totalSteps || 1);
  const subtitle = roamMode
    ? "Modo livre: toque uma casa para abrir detalhes"
    : tileVisual.effectLabel;

  return (
    <View style={styles.frame}>
      <View style={styles.fabricPanel}>
        <View style={styles.headerTop}>
          <Text style={styles.stepLabel}>
            Casa {safeStep} de {Math.max(totalSteps, 1)}
          </Text>
          <View
            style={[styles.colorBadge, { backgroundColor: tileVisual.base }]}
          >
            <AppIcon
              name={isMoving ? "shoe-prints" : tileVisual.icon}
              size={11}
              color={COLORS.text}
            />
            <Text style={styles.colorBadgeText}>
              {isMoving ? "Em deslocamento" : tileVisual.label}
            </Text>
          </View>
        </View>

        <View style={styles.contentRow}>
          <View style={styles.imageFrame}>
            <Image
              source={imageSource}
              style={styles.image}
              contentFit="cover"
              transition={180}
            />
          </View>

          <View style={styles.metaColumn}>
            <Text style={styles.headline}>
              {tile?.text ||
                "Avance pelo tabuleiro para descobrir cada conteúdo."}
            </Text>
            <Text style={styles.effectText} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(0, Math.min(progress, 100))}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    alignSelf: "stretch",
    marginHorizontal: 0,
    marginTop: 25,
    borderRadius: 20,
    borderWidth: theme.borderWidth.normal,
    borderColor: "#4E2C17",
    backgroundColor: "#8A5A34",
    overflow: "hidden",
    ...theme.shadows.md,
  },
  fabricPanel: {
    margin: 8,
    borderRadius: 14,
    borderWidth: theme.borderWidth.thin,
    borderColor: "#D2B895",
    backgroundColor: "#F7EBD9",
    padding: 10,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  colorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    borderRadius: 999,
    paddingVertical: 4.5,
    paddingHorizontal: 9,
    maxWidth: "62%",
  },
  colorBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.text,
    flexShrink: 1,
  },
  contentRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  imageFrame: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: theme.borderWidth.thin,
    borderColor: "#B78D5F",
    backgroundColor: "#FFF7EC",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  metaColumn: {
    flex: 1,
    minHeight: 76,
    justifyContent: "center",
    gap: 1,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#5B351E",
    letterSpacing: 0.25,
    flexShrink: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.35,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  effectLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.text,
    lineHeight: 22,
  },
  effectText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5D5BF",
    borderWidth: theme.borderWidth.thin,
    borderColor: "#B78D5F",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C66B27",
  },
});
