import { CanvasErrorBoundary } from "@/src/components/game/CanvasErrorBoundary";
import { AnimatedButton } from "@/src/components/ui/AnimatedButton";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { Card3D } from "@/src/components/ui/Card3D";
import { GlassPanel } from "@/src/components/ui/GlassPanel";
import { COLORS } from "@/src/constants/colors";
import { applyAvatarColors, cloneAvatarScene } from "@/src/game/avatarModel";
import { useGameStore } from "@/src/game/state/gameState";
import { Canvas } from "@/src/lib/r3f/canvas";
import { useGLTF } from "@/src/lib/r3f/drei";
import { useEscapeToClose } from "@/src/hooks/useEscapeToClose";
import { multiplayerApi } from "@/src/services/multiplayer/api";
import { buildAvatarCharacterId } from "@/src/services/multiplayer/avatarCharacter";
import { getOrCreateMultiplayerClientId } from "@/src/services/multiplayer/clientIdentity";
import {
  convexClient,
  isConvexConfigured,
} from "@/src/services/multiplayer/convexClient";
import { useMultiplayerRuntimeStore } from "@/src/services/multiplayer/runtimeStore";
import { triggerHaptic } from "@/src/utils/haptics";
import { isWebGLAvailable } from "@/src/utils/webgl";
import { useFrame } from "@react-three/fiber";
import { Asset } from "expo-asset";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Group } from "three";
/* eslint-disable react/no-unknown-property */

// Keep require for Expo asset compatibility with GLB module resolution.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHARACTER_MODEL_MODULE = require("../../../assets/character.glb");
const characterAsset = Asset.fromModule(CHARACTER_MODEL_MODULE);
const CHARACTER_MODEL_URI = characterAsset.uri;

useGLTF.preload(CHARACTER_MODEL_URI);

const AvatarPreviewModel: React.FC<{
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  onReady?: () => void;
}> = ({ shirtColor, hairColor, skinColor, onReady }) => {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(CHARACTER_MODEL_URI);

  const clone = useMemo(() => {
    return cloneAvatarScene(scene);
  }, [scene]);

  useEffect(() => {
    clone.traverse((object) =>
      applyAvatarColors(object, { skinColor, hairColor, shirtColor }),
    );
  }, [clone, hairColor, shirtColor, skinColor]);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 1.1) * 0.28;
  });

  return (
    <group ref={groupRef} position={[0, -0.28, 0]}>
      <primitive
        object={clone}
        scale={[0.8, 0.8, 0.8]}
        position={[0, 0.2, 0]}
      />
    </group>
  );
};

const AvatarPreview: React.FC<{
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  compact: boolean;
}> = ({ shirtColor, hairColor, skinColor, compact }) => {
  const [modelReady, setModelReady] = useState(false);
  const showCanvas = isWebGLAvailable();
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    return () => {
      if (glRef.current) {
        const gl = glRef.current;
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
        glRef.current = null;
      }
    };
  }, []);

  return (
    <View style={[styles.previewCard, compact && styles.previewCardCompact]}>
      <View style={styles.previewContent}>
        <View
          style={[styles.previewAvatar, compact && styles.previewAvatarCompact]}
        >
          {showCanvas && (
            <CanvasErrorBoundary
              fallback={<View style={styles.previewFallback} />}
            >
              <Canvas
                camera={
                  compact
                    ? { position: [0, 1.1, 2.85], fov: 37 }
                    : { position: [0, 1.15, 2.95], fov: 34 }
                }
                onCreated={(state) => {
                  state.gl.debug.checkShaderErrors = false;
                  glRef.current = state.gl.getContext();
                }}
              >
                <ambientLight intensity={0.7} color="#FFF7EE" />
                <directionalLight
                  intensity={1.0}
                  position={[2, 4, 2]}
                  color="#FFF2DD"
                />
                <hemisphereLight args={["#FFF6E9", "#B4DFA5", 0.45]} />
                <Suspense fallback={null}>
                  <AvatarPreviewModel
                    shirtColor={shirtColor}
                    hairColor={hairColor}
                    skinColor={skinColor}
                    onReady={() => setModelReady(true)}
                  />
                </Suspense>
              </Canvas>
            </CanvasErrorBoundary>
          )}

          {(!showCanvas || !modelReady) && (
            <View style={styles.previewFallback}>
              <View
                style={[styles.fallbackHead, { backgroundColor: skinColor }]}
              />
              <View
                style={[styles.fallbackBody, { backgroundColor: shirtColor }]}
              />
              <View
                style={[styles.fallbackHair, { backgroundColor: hairColor }]}
              />
            </View>
          )}
        </View>
        <View
          style={[
            styles.previewLegendColumn,
            compact && styles.previewLegendColumnCompact,
          ]}
        >
          {[
            { label: "Roupa", color: shirtColor },
            { label: "Cabelo", color: hairColor },
            { label: "Pele", color: skinColor },
          ].map((chip) => (
            <View
              key={chip.label}
              style={[styles.previewChip, compact && styles.previewChipCompact]}
            >
              <View
                style={[styles.previewChipDot, { backgroundColor: chip.color }]}
              />
              <Text
                style={[
                  styles.previewChipLabel,
                  compact && styles.previewChipLabelCompact,
                ]}
              >
                {chip.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export const CustomizationModal: React.FC = () => {
  const showCustomization = useGameStore((s) => s.showCustomization);
  const setShowCustomization = useGameStore((s) => s.setShowCustomization);
  const playerName = useGameStore((s) => s.playerName);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const shirtColor = useGameStore((s) => s.shirtColor);
  const hairColor = useGameStore((s) => s.hairColor);
  const setShirtColor = useGameStore((s) => s.setShirtColor);
  const setHairColor = useGameStore((s) => s.setHairColor);
  const skinColor = useGameStore((s) => s.skinColor);
  const setSkinColor = useGameStore((s) => s.setSkinColor);
  const multiplayerRoomId = useMultiplayerRuntimeStore((state) => state.roomId);
  const multiplayerRoomStatus = useMultiplayerRuntimeStore(
    (state) => state.roomStatus,
  );
  const { width, height } = useWindowDimensions();
  const isNarrowScreen = width < 370;
  const isShortScreen = height < 760;

  const [activeTab, setActiveTab] = React.useState<"shirt" | "hair" | "skin">(
    "shirt",
  );
  const [draftShirtColor, setDraftShirtColor] = React.useState(shirtColor);
  const [draftHairColor, setDraftHairColor] = React.useState(hairColor);
  const [draftSkinColor, setDraftSkinColor] = React.useState(skinColor);
  const [draftPlayerName, setDraftPlayerName] = React.useState(playerName);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const wasCustomizationOpenRef = useRef(false);
  const canvasKeyRef = useRef(0);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleSave = useCallback(() => {
    if (isSavingProfile) return;

    const saveProfile = async () => {
      const nextCharacterId = buildAvatarCharacterId({
        shirtColor: draftShirtColor,
        hairColor: draftHairColor,
        skinColor: draftSkinColor,
      });
      const normalizedPlayerName = draftPlayerName.trim();

      setIsSavingProfile(true);
      setSaveErrorMessage(null);
      const commitLocalProfile = () => {
        if (draftPlayerName !== playerName) setPlayerName(draftPlayerName);
        if (draftShirtColor !== shirtColor) setShirtColor(draftShirtColor);
        if (draftHairColor !== hairColor) setHairColor(draftHairColor);
        if (draftSkinColor !== skinColor) setSkinColor(draftSkinColor);
      };

      if (
        multiplayerRoomId &&
        multiplayerRoomStatus === "lobby" &&
        isConvexConfigured &&
        convexClient
      ) {
        try {
          const clientId = await getOrCreateMultiplayerClientId();
          await convexClient.mutation(multiplayerApi.rooms.updatePlayerProfile, {
            roomId: multiplayerRoomId,
            clientId,
            name: normalizedPlayerName || undefined,
            characterId: nextCharacterId,
          });
        } catch (error) {
          setSaveErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Não foi possível atualizar o perfil da sala.",
          );
          setIsSavingProfile(false);
          return;
        }
      }

      commitLocalProfile();
      setIsSavingProfile(false);
      setShowCustomization(false);
    };

    void saveProfile();
  }, [
    draftPlayerName,
    draftHairColor,
    draftShirtColor,
    draftSkinColor,
    hairColor,
    isSavingProfile,
    multiplayerRoomId,
    multiplayerRoomStatus,
    playerName,
    setHairColor,
    setPlayerName,
    setShirtColor,
    setShowCustomization,
    setSkinColor,
    shirtColor,
    skinColor,
  ]);

  useEffect(() => {
    if (!showCustomization) {
      wasCustomizationOpenRef.current = false;
      canvasKeyRef.current += 1;
      setCanvasKey(canvasKeyRef.current);
      return;
    }

    if (wasCustomizationOpenRef.current) return;

    wasCustomizationOpenRef.current = true;
    setDraftPlayerName(playerName);
    setDraftShirtColor(shirtColor);
    setDraftHairColor(hairColor);
    setDraftSkinColor(skinColor);
    setActiveTab("shirt");
    setSaveErrorMessage(null);
    setIsSavingProfile(false);
    slideAnim.setValue(0);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [hairColor, playerName, shirtColor, showCustomization, skinColor, slideAnim]);

  useEffect(() => {
    if (!showCustomization) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleSave();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [handleSave, showCustomization]);

  useEscapeToClose(handleSave, showCustomization);

  const shirtColors = [
    { color: "#FF6B6B", name: "Coral" },
    { color: "#4ECDC4", name: "Ciano" },
    { color: "#95E1D3", name: "Menta" },
    { color: "#FFE66D", name: "Amarelo" },
    { color: "#DDA0DD", name: "Ameixa" },
    { color: "#87CEEB", name: "Céu" },
  ];

  const hairColors = [
    { color: "#4A3B2A", name: "Castanho" },
    { color: "#1A1A2E", name: "Preto" },
    { color: "#D4A574", name: "Loiro" },
    { color: "#8B4513", name: "Ruivo" },
    { color: "#E6B8A2", name: "Cobre" },
    { color: "#6B5B95", name: "Roxo" },
  ];

  const skinColors = [
    { color: "#FFD5B8", name: "Clara" },
    { color: "#E6B8A2", name: "Média" },
    { color: "#8D5524", name: "Escura" },
    { color: "#C68642", name: "Morena" },
    { color: "#F0C8C9", name: "Pálida" },
    { color: "#3C2E28", name: "Preta" },
  ];

  const handleColorSelect = (color: string) => {
    if (activeTab === "shirt") {
      setDraftShirtColor(color);
    } else if (activeTab === "hair") {
      setDraftHairColor(color);
    } else {
      setDraftSkinColor(color);
    }
  };

  const handleTabChange = (tab: "shirt" | "hair" | "skin") => {
    triggerHaptic("light");
    setActiveTab(tab);
  };

  if (!showCustomization) {
    return null;
  }

  const selectedColor =
    activeTab === "shirt"
      ? draftShirtColor
      : activeTab === "hair"
        ? draftHairColor
        : draftSkinColor;
  const activePalette =
    activeTab === "shirt"
      ? shirtColors
      : activeTab === "hair"
        ? hairColors
        : skinColors;
  const activeTabLabel =
    activeTab === "shirt" ? "Roupa" : activeTab === "hair" ? "Cabelo" : "Pele";
  const selectedColorName =
    activePalette.find((option) => option.color === selectedColor)?.name ??
    "Atual";

  return (
    <Modal
      visible={showCustomization}
      transparent
      animationType="none"
      onRequestClose={handleSave}
      accessibilityViewIsModal
    >
      <View style={styles.modalPortal} pointerEvents="auto">
        <GlassPanel intensity="strong" radius={0} style={StyleSheet.absoluteFillObject} />
        <View
          style={[
            styles.modalOverlay,
            isNarrowScreen && styles.modalOverlayNarrow,
          ]}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none" />
          <ScrollView
            contentContainerStyle={[
              styles.modalScrollContent,
              isShortScreen && styles.modalScrollContentCompact,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Animated.View
              style={[
                styles.modalContent,
                isNarrowScreen && styles.modalContentNarrow,
                isShortScreen && styles.modalContentShort,
                {
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                    {
                      scale: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                  opacity: slideAnim,
                },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  isNarrowScreen && styles.modalHeaderNarrow,
                ]}
              >
                <Text
                  style={[
                    styles.modalTitle,
                    isNarrowScreen && styles.modalTitleNarrow,
                  ]}
                >
                  Personalizar
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    isNarrowScreen && styles.modalSubtitleNarrow,
                  ]}
                >
                  Escolha as cores de roupa, cabelo e pele.
                </Text>
              </View>

              <AvatarPreview
                key={canvasKey}
                shirtColor={draftShirtColor}
                hairColor={draftHairColor}
                skinColor={draftSkinColor}
                compact={isNarrowScreen}
              />

              <View style={styles.nameCard}>
                <View style={styles.nameHeaderRow}>
                  <AppIcon name="signature" size={14} color={COLORS.text} />
                  <Text style={styles.nameLabel}>Nome do jogador</Text>
                </View>
                <TextInput
                  value={draftPlayerName}
                  onChangeText={setDraftPlayerName}
                  placeholder="Como você quer aparecer no jogo?"
                  placeholderTextColor="#8F7A66"
                  style={[
                    styles.nameInput,
                    isNarrowScreen && styles.nameInputNarrow,
                  ]}
                  autoCapitalize="words"
                  autoCorrect={false}
                  maxLength={26}
                  editable={!isSavingProfile}
                  returnKeyType="done"
                />
                <Text style={styles.nameHint}>
                  Este nome será usado no modo solo e nas salas multiplayer.
                </Text>
              </View>

              <View
                style={[
                  styles.modalTabs,
                  isNarrowScreen && styles.modalTabsNarrow,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.modalTab,
                    isNarrowScreen && styles.modalTabNarrow,
                    activeTab === "shirt" && styles.modalTabActive,
                  ]}
                  onPress={() => handleTabChange("shirt")}
                >
                  <View style={styles.modalTabContent}>
                    <AppIcon
                      name="shirt"
                      size={16}
                      color={
                        activeTab === "shirt" ? COLORS.text : COLORS.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.modalTabText,
                        isNarrowScreen && styles.modalTabTextNarrow,
                        activeTab === "shirt" && styles.modalTabTextActive,
                      ]}
                    >
                      ROUPA
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalTab,
                    isNarrowScreen && styles.modalTabNarrow,
                    activeTab === "hair" && styles.modalTabActive,
                  ]}
                  onPress={() => handleTabChange("hair")}
                >
                  <View style={styles.modalTabContent}>
                    <AppIcon
                      name="scissors"
                      size={16}
                      color={
                        activeTab === "hair" ? COLORS.text : COLORS.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.modalTabText,
                        isNarrowScreen && styles.modalTabTextNarrow,
                        activeTab === "hair" && styles.modalTabTextActive,
                      ]}
                    >
                      CABELO
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalTab,
                    isNarrowScreen && styles.modalTabNarrow,
                    activeTab === "skin" && styles.modalTabActive,
                  ]}
                  onPress={() => handleTabChange("skin")}
                >
                  <View style={styles.modalTabContent}>
                    <AppIcon
                      name="user"
                      size={16}
                      color={
                        activeTab === "skin" ? COLORS.text : COLORS.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.modalTabText,
                        isNarrowScreen && styles.modalTabTextNarrow,
                        activeTab === "skin" && styles.modalTabTextActive,
                      ]}
                    >
                      PELE
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.modalBody,
                  isNarrowScreen && styles.modalBodyNarrow,
                ]}
              >
                <View style={styles.paletteHeader}>
                  <View style={styles.paletteTitleRow}>
                    <AppIcon name="palette" size={13} color={COLORS.text} />
                    <Text style={styles.paletteTitle}>
                      {activeTabLabel.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.selectedColorPill}>
                    <View
                      style={[
                        styles.selectedColorDot,
                        { backgroundColor: selectedColor },
                      ]}
                    />
                    <Text style={styles.selectedColorText}>
                      {selectedColorName}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.colorGrid,
                    isNarrowScreen && styles.colorGridNarrow,
                  ]}
                >
                  {activePalette.map(({ color, name }) => (
                    <View
                      key={color}
                      style={[
                        styles.colorButton,
                        isNarrowScreen && styles.colorButtonNarrow,
                      ]}
                    >
                      <AnimatedButton
                        onPress={() => handleColorSelect(color)}
                        hapticStyle="light"
                        disabled={isSavingProfile}
                      >
                        <View
                          style={[
                            styles.colorOptionWrapper,
                            isNarrowScreen && styles.colorOptionWrapperNarrow,
                          ]}
                        >
                          <View
                            style={[
                              styles.colorOption,
                              isNarrowScreen && styles.colorOptionNarrow,
                              { backgroundColor: color },
                              selectedColor === color &&
                                styles.colorOptionSelected,
                            ]}
                          >
                            {selectedColor === color && (
                              <AppIcon
                                name="check"
                                size={18}
                                color="#FFF"
                                style={styles.checkMark}
                              />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.colorLabel,
                              isNarrowScreen && styles.colorLabelNarrow,
                            ]}
                          >
                            {name}
                          </Text>
                        </View>
                      </AnimatedButton>
                    </View>
                  ))}
                </View>
              </View>

              {saveErrorMessage ? (
                <View style={styles.saveErrorCard}>
                  <AppIcon
                    name="triangle-exclamation"
                    size={14}
                    color="#7A1414"
                  />
                  <Text style={styles.saveErrorText}>{saveErrorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                <Card3D
                  style={styles.startButton}
                  height={50}
                  borderRadius={14}
                  theme="pink"
                  depth={7}
                  testID="btn-save-customization"
                  onPress={handleSave}
                  disabled={isSavingProfile}
                  haptic="medium"
                  accessibilityLabel="Salvar personalização"
                >
                  <View style={styles.startButtonInner}>
                    <Text style={styles.startButtonText}>
                      {isSavingProfile ? "SALVANDO..." : "SALVAR"}
                    </Text>
                    <AppIcon name="check" size={14} color="#FFF" />
                  </View>
                </Card3D>
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "stretch",
    padding: 12,
  },
  modalOverlayNarrow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
  modalScrollContentCompact: {
    justifyContent: "flex-start",
    paddingVertical: 8,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "rgba(244, 234, 219, 0.9)",
    borderRadius: 26,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 6, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 0,
    elevation: 14,
  },
  modalContentNarrow: {
    maxWidth: 312,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
  },
  modalContentShort: {
    marginVertical: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  modalHeaderNarrow: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  modalTitleNarrow: {
    fontSize: 18,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  modalSubtitleNarrow: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewCard: {
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
  },
  previewContent: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  previewCardCompact: {
    marginTop: 6,
    marginBottom: 8,
    padding: 8,
    borderRadius: 16,
  },
  nameCard: {
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    gap: 8,
  },
  nameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  nameInputNarrow: {
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  nameHint: {
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  previewAvatar: {
    width: 116,
    height: 116,
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(244,235,221,0.6)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    marginBottom: 0,
    position: "relative",
  },
  previewAvatarCompact: {
    width: 104,
    height: 104,
    borderRadius: 14,
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F4EBDD",
  },
  fallbackHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.16)",
    marginTop: 6,
  },
  fallbackBody: {
    width: 50,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.16)",
  },
  fallbackHair: {
    position: "absolute",
    top: 34,
    width: 36,
    height: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.16)",
  },
  previewLegendColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
    gap: 8,
  },
  previewLegendColumnCompact: {
    gap: 6,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  previewChipCompact: {
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  previewChipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  previewChipLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },
  previewChipLabelCompact: {
    fontSize: 10,
  },
  saveErrorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#C86A6A",
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    padding: 10,
  },
  saveErrorText: {
    flex: 1,
    color: "#7A1414",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  modalTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.3)",
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    marginBottom: 10,
  },
  modalTabsNarrow: {
    marginBottom: 8,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 10,
  },
  modalTabNarrow: {
    paddingVertical: 6,
  },
  modalTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalTabActive: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 0,
  },
  modalTabText: { fontWeight: "700", color: COLORS.textMuted },
  modalTabTextNarrow: { fontSize: 11 },
  modalTabTextActive: { fontWeight: "900", color: COLORS.text },
  modalBody: {
    minHeight: 138,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    padding: 10,
  },
  modalBodyNarrow: { minHeight: 98 },
  paletteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  paletteTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  paletteTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  selectedColorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  selectedColorText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.text,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 10,
    justifyContent: "space-between",
  },
  colorGridNarrow: { rowGap: 9 },
  colorButton: {
    width: "31%",
  },
  colorButtonNarrow: {
    width: "31%",
  },
  colorOptionWrapper: { alignItems: "center", gap: 4 },
  colorOptionWrapperNarrow: { gap: 4 },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
  },
  colorOptionNarrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorOptionSelected: {
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.03 }],
  },
  colorLabel: { fontSize: 11, fontWeight: "800", color: COLORS.text },
  colorLabelNarrow: { fontSize: 10 },
  checkMark: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  startButton: { flex: 1 },
  startButtonNarrow: { flex: 1 },
  actionsRow: {
    flexDirection: "row",
    gap: 0,
    marginTop: 12,
  },
  onlySaveButton: {
    width: "100%",
  },
  startButtonInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startButtonText: {
    fontWeight: "900",
    fontSize: 14,
    color: "#FFF",
    letterSpacing: 0.6,
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
