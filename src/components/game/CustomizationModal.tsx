import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { applyAvatarColors, cloneAvatarScene } from '@/src/game/avatarModel';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import { useGLTF } from '@react-three/drei/native';
import { useFrame } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber/native';
import { Asset } from 'expo-asset';
import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as THREE from 'three';
/* eslint-disable react/no-unknown-property */

// Keep require for Expo asset compatibility with GLB module resolution.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CHARACTER_MODEL_MODULE = require('../../../assets/character.glb');
const characterAsset = Asset.fromModule(CHARACTER_MODEL_MODULE);

const AvatarPreviewModel: React.FC<{
  modelUri: string;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
}> = ({ modelUri, shirtColor, hairColor, skinColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUri);

  const clone = useMemo(() => {
    return cloneAvatarScene(scene);
  }, [scene]);

  useEffect(() => {
    clone.traverse((object) => applyAvatarColors(object, { skinColor, hairColor, shirtColor }));
  }, [clone, hairColor, shirtColor, skinColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.1) * 0.28;
  });

  return (
    <group ref={groupRef} position={[0, -0.4, 0]}>
      <primitive object={clone} scale={[0.8, 0.8, 0.8]} position={[0, -0.1, 0]} />
    </group>
  );
};

const AvatarPreview: React.FC<{
  shirtColor: string;
  hairColor: string;
  skinColor: string;
  compact: boolean;
  veryNarrow: boolean;
}> = ({ shirtColor, hairColor, skinColor, compact, veryNarrow }) => {
  const [modelUri, setModelUri] = React.useState<string | null>(characterAsset.localUri ?? null);

  useEffect(() => {
    let isMounted = true;

    const ensureModelUri = async () => {
      if (characterAsset.localUri) {
        setModelUri(characterAsset.localUri);
        return;
      }

      try {
        await characterAsset.downloadAsync();
      } catch {
        // We still try to render with the packager URI if local download fails.
      }

      if (!isMounted) return;
      setModelUri(characterAsset.localUri ?? characterAsset.uri ?? null);
    };

    void ensureModelUri();

    return () => {
      isMounted = false;
    };
  }, []);

  const chips = useMemo(() => ([
    { label: 'Roupa', icon: 'shirt', color: shirtColor },
    { label: 'Cabelo', icon: 'scissors', color: hairColor },
    { label: 'Pele', icon: 'user', color: skinColor },
  ]), [shirtColor, hairColor, skinColor]);

  return (
    <View style={[styles.previewCard, compact && styles.previewCardCompact]}>
      <View style={styles.previewHalo} />
      <View style={[styles.previewAvatar, compact && styles.previewAvatarCompact]}>
        {modelUri ? (
          <Canvas
            camera={compact ? { position: [0, 1.15, 3.1], fov: 38 } : { position: [0, 1.2, 3.2], fov: 35 }}
            onCreated={(state) => {
              state.gl.debug.checkShaderErrors = false;
            }}
          >
            <ambientLight intensity={0.7} color="#FFF7EE" />
            <directionalLight intensity={1.0} position={[2, 4, 2]} color="#FFF2DD" />
            <hemisphereLight args={['#FFF6E9', '#B4DFA5', 0.45]} />
            <Suspense fallback={null}>
              <AvatarPreviewModel
                modelUri={modelUri}
                shirtColor={shirtColor}
                hairColor={hairColor}
                skinColor={skinColor}
              />
            </Suspense>
          </Canvas>
        ) : (
          <View style={styles.previewFallback}>
            <AppIcon name="user" size={compact ? 34 : 38} color={COLORS.textMuted} />
          </View>
        )}
      </View>
      <View style={[styles.previewLegendRow, compact && styles.previewLegendRowCompact]}>
        {chips.map((chip) => (
          <View key={chip.label} style={[styles.previewChip, compact && styles.previewChipCompact, veryNarrow && styles.previewChipVeryNarrow]}>
            <View style={[styles.previewChipDot, { backgroundColor: chip.color }]} />
            <AppIcon name={chip.icon} size={compact ? 11 : 12} color={COLORS.text} />
            <Text style={[styles.previewChipLabel, compact && styles.previewChipLabelCompact]} numberOfLines={1}>
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const CustomizationModal: React.FC = () => {
  const { 
    showCustomization, 
    setShowCustomization,
    shirtColor,
    hairColor,
    setShirtColor,
    setHairColor,
    skinColor,
    setSkinColor,
  } = useGameStore();
  const { width, height } = useWindowDimensions();
  const isNarrowScreen = width < 370;
  const isVeryNarrowScreen = width < 340;
  const isShortScreen = height < 760;
  
  const [activeTab, setActiveTab] = React.useState<'shirt' | 'hair' | 'skin'>('shirt');
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showCustomization ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [showCustomization, slideAnim]);

  const shirtColors = [
    { color: '#FF6B6B', name: 'Coral' },
    { color: '#4ECDC4', name: 'Ciano' },
    { color: '#95E1D3', name: 'Menta' },
    { color: '#FFE66D', name: 'Amarelo' },
    { color: '#DDA0DD', name: 'Ameixa' },
    { color: '#87CEEB', name: 'Céu' },
  ];
  
  const hairColors = [
    { color: '#4A3B2A', name: 'Castanho' },
    { color: '#1A1A2E', name: 'Preto' },
    { color: '#D4A574', name: 'Loiro' },
    { color: '#8B4513', name: 'Ruivo' },
    { color: '#E6B8A2', name: 'Cobre' },
    { color: '#6B5B95', name: 'Roxo' },
  ];

  const skinColors = [
    { color: '#FFD5B8', name: 'Clara' },
    { color: '#E6B8A2', name: 'Média' },
    { color: '#8D5524', name: 'Escura' },
    { color: '#C68642', name: 'Morena' },
    { color: '#F0C8C9', name: 'Pálida' },
    { color: '#3C2E28', name: 'Preta' },
  ];

  const handleColorSelect = (color: string) => {
    if (activeTab === 'shirt') {
      setShirtColor(color);
    } else if (activeTab === 'hair') {
      setHairColor(color);
    } else {
      setSkinColor(color);
    }
  };

  const handleTabChange = (tab: 'shirt' | 'hair' | 'skin') => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showCustomization}
      onRequestClose={() => setShowCustomization(false)}
    >
      <View style={[styles.modalOverlay, isNarrowScreen && styles.modalOverlayNarrow]}>
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
                    })
                  },
                  {
                    scale: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    })
                  }
                ],
                opacity: slideAnim,
              }
            ]}
          >
            <View style={[styles.modalHeader, isNarrowScreen && styles.modalHeaderNarrow]}>
              <View style={styles.modalBadge}>
                <AppIcon name="wand-magic-sparkles" size={16} color={COLORS.text} />
                <Text style={styles.modalBadgeText}>VISUAL DO JOGADOR</Text>
              </View>
              <Text style={[styles.modalTitle, isNarrowScreen && styles.modalTitleNarrow]}>Personalizar</Text>
              <Text style={[styles.modalSubtitle, isNarrowScreen && styles.modalSubtitleNarrow]}>
                Ajuste rapidamente as cores para deixar o avatar com a sua cara.
              </Text>
            </View>

            <AvatarPreview
              shirtColor={shirtColor}
              hairColor={hairColor}
              skinColor={skinColor}
              compact={isNarrowScreen}
              veryNarrow={isVeryNarrowScreen}
            />
            
            <View style={[styles.modalTabs, isNarrowScreen && styles.modalTabsNarrow]}>
              <TouchableOpacity 
                style={[styles.modalTab, isNarrowScreen && styles.modalTabNarrow, activeTab === 'shirt' && styles.modalTabActive]}
                onPress={() => handleTabChange('shirt')}
              >
                <View style={styles.modalTabContent}>
                  <AppIcon name="shirt" size={16} color={activeTab === 'shirt' ? COLORS.text : COLORS.textMuted} />
                  <Text style={[styles.modalTabText, isNarrowScreen && styles.modalTabTextNarrow, activeTab === 'shirt' && styles.modalTabTextActive]}>
                    ROUPA
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalTab, isNarrowScreen && styles.modalTabNarrow, activeTab === 'hair' && styles.modalTabActive]}
                onPress={() => handleTabChange('hair')}
              >
                <View style={styles.modalTabContent}>
                  <AppIcon name="scissors" size={16} color={activeTab === 'hair' ? COLORS.text : COLORS.textMuted} />
                  <Text style={[styles.modalTabText, isNarrowScreen && styles.modalTabTextNarrow, activeTab === 'hair' && styles.modalTabTextActive]}>
                    CABELO
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalTab, isNarrowScreen && styles.modalTabNarrow, activeTab === 'skin' && styles.modalTabActive]}
                onPress={() => handleTabChange('skin')}
              >
                <View style={styles.modalTabContent}>
                  <AppIcon name="user" size={16} color={activeTab === 'skin' ? COLORS.text : COLORS.textMuted} />
                  <Text style={[styles.modalTabText, isNarrowScreen && styles.modalTabTextNarrow, activeTab === 'skin' && styles.modalTabTextActive]}>
                    PELE
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.modalBody, isNarrowScreen && styles.modalBodyNarrow]}>
              <View style={[styles.colorGrid, isNarrowScreen && styles.colorGridNarrow]}>
                {(activeTab === 'shirt' ? shirtColors : activeTab === 'hair' ? hairColors : skinColors).map(({ color, name }) => (
                  <AnimatedButton 
                    key={color}
                    onPress={() => handleColorSelect(color)}
                    hapticStyle="light"
                  >
                    <View style={[styles.colorOptionWrapper, isNarrowScreen && styles.colorOptionWrapperNarrow]}>
                      <View style={[
                        styles.colorOption,
                        isNarrowScreen && styles.colorOptionNarrow,
                        { backgroundColor: color },
                        (activeTab === 'shirt' ? shirtColor : activeTab === 'hair' ? hairColor : skinColor) === color && styles.colorOptionSelected,
                      ]}>
                        {(activeTab === 'shirt' ? shirtColor : activeTab === 'hair' ? hairColor : skinColor) === color && (
                          <AppIcon name="check" size={18} color="#FFF" style={styles.checkMark} />
                        )}
                      </View>
                      <Text style={[styles.colorLabel, isNarrowScreen && styles.colorLabelNarrow]}>{name}</Text>
                    </View>
                  </AnimatedButton>
                ))}
              </View>
            </View>

            <AnimatedButton 
              style={[styles.startButton, isNarrowScreen && styles.startButtonNarrow]} 
              testID="btn-save-customization"
              onPress={() => {
                setShowCustomization(false);
              }}
              hapticStyle="success"
            >
              <View style={styles.startButtonInner}>
                <Text style={styles.startButtonText}>SALVAR</Text>
              </View>
            </AnimatedButton>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 16, 10, 0.45)',
    alignItems: 'stretch',
    padding: 20,
  },
  modalOverlayNarrow: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalScrollContentCompact: {
    justifyContent: 'flex-start',
    paddingVertical: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFCF8',
    borderRadius: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E9DFD3',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalContentNarrow: {
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 26,
  },
  modalContentShort: {
    marginVertical: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderNarrow: {
    marginBottom: 12,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFF1DF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE1B8',
    marginBottom: 8,
  },
  modalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.text,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  modalTitleNarrow: {
    fontSize: 21,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalSubtitleNarrow: {
    fontSize: 12,
    lineHeight: 18,
  },
  previewCard: {
    marginTop: 16,
    marginBottom: 18,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#F2E8DA',
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  previewCardCompact: {
    marginTop: 10,
    marginBottom: 14,
    padding: 12,
    borderRadius: 20,
  },
  previewHalo: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(247, 147, 30, 0.1)',
    borderRadius: 60,
  },
  previewAvatar: {
    alignSelf: 'center',
    width: 152,
    height: 152,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#F4EBDD',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E3D4C1',
    marginBottom: 2,
  },
  previewAvatarCompact: {
    width: 134,
    height: 134,
    borderRadius: 18,
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  previewLegendRowCompact: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  previewChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F6F1EB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  previewChipCompact: {
    flexBasis: '48%',
    flexGrow: 0,
  },
  previewChipVeryNarrow: {
    flexBasis: '100%',
  },
  previewChipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  previewChipLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
  },
  previewChipLabelCompact: {
    fontSize: 11,
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#F6F1EB',
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalTabsNarrow: {
    marginBottom: 14,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  modalTabNarrow: {
    paddingVertical: 8,
  },
  modalTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTabActive: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalTabText: { fontWeight: '700', color: COLORS.textMuted },
  modalTabTextNarrow: { fontSize: 12 },
  modalTabTextActive: { fontWeight: '900', color: COLORS.text },
  modalBody: { minHeight: 140, justifyContent: 'center' },
  modalBodyNarrow: { minHeight: 124 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorGridNarrow: { gap: 10 },
  colorOptionWrapper: { alignItems: 'center', gap: 6 },
  colorOptionWrapperNarrow: { gap: 4 },
  colorOption: {
    width: 62, height: 62, borderRadius: 32, borderWidth: 2, borderColor: '#E7D8C7',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  colorOptionNarrow: {
    width: 54,
    height: 54,
    borderRadius: 28,
  },
  colorOptionSelected: { borderColor: COLORS.text, transform: [{scale:1.06}] },
  colorLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  colorLabelNarrow: { fontSize: 11 },
  checkMark: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  startButton: { marginTop: 22 },
  startButtonNarrow: { marginTop: 16 },
  startButtonInner: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  startButtonText: { fontWeight: '900', fontSize: 16, color: COLORS.text },
});
