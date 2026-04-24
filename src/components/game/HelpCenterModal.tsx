import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { TILE_VISUALS } from '@/src/game/constants';
import { HelpCenterSection, RenderQuality, useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTION_OPTIONS: { id: HelpCenterSection; title: string; icon: string }[] = [
  { id: 'como-jogar', title: 'Como Jogar', icon: 'dice' },
  { id: 'controles', title: 'Controles', icon: 'gamepad' },
  { id: 'qualidade', title: 'Ajustes', icon: 'sliders' },
  { id: 'sobre', title: 'Sobre', icon: 'circle-info' },
];

const QUALITY_OPTIONS: { value: RenderQuality; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

type VolumeSliderProps = {
  icon: string;
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  testID: string;
};

const formatVolume = (value: number): string => `${Math.round(value * 100)}%`;

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  icon,
  title,
  description,
  value,
  onChange,
  testID,
}) => {
  const trackWidthRef = useRef(1);

  const setFromTrackX = React.useCallback(
    (locationX: number) => {
      const raw = Math.max(0, Math.min(1, locationX / trackWidthRef.current));
      onChange(Math.round(raw * 20) / 20);
    },
    [onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => setFromTrackX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => setFromTrackX(event.nativeEvent.locationX),
      }),
    [setFromTrackX]
  );

  const adjust = (delta: number) => {
    triggerHaptic('light');
    onChange(Math.round(Math.max(0, Math.min(1, value + delta)) * 20) / 20);
  };

  return (
    <View style={styles.volumeControl}>
      <View style={styles.volumeHeader}>
        <View style={styles.volumeTitleRow}>
          <AppIcon name={icon} size={16} color={COLORS.text} />
          <View style={styles.volumeTextGroup}>
            <Text style={styles.volumeTitle}>{title}</Text>
            <Text style={styles.volumeDescription}>{description}</Text>
          </View>
        </View>
        <Text style={styles.volumeValue}>{formatVolume(value)}</Text>
      </View>
      <View style={styles.volumeSliderRow}>
        <TouchableOpacity
          style={styles.volumeStepButton}
          onPress={() => adjust(-0.05)}
          accessibilityRole="button"
          accessibilityLabel={`Diminuir ${title}`}
          testID={`${testID}-down`}
        >
          <AppIcon name="minus" size={12} color={COLORS.text} />
        </TouchableOpacity>
        <View
          style={styles.volumeTrack}
          onLayout={(event) => {
            trackWidthRef.current = Math.max(1, event.nativeEvent.layout.width);
          }}
          testID={testID}
          {...panResponder.panHandlers}
        >
          <View style={[styles.volumeTrackFill, { width: `${value * 100}%` }]} />
          <View style={[styles.volumeThumb, { left: `${value * 100}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.volumeStepButton}
          onPress={() => adjust(0.05)}
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${title}`}
          testID={`${testID}-up`}
        >
          <AppIcon name="plus" size={12} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HelpCenterModal: React.FC = () => {
  const showHelpCenter = useGameStore((s) => s.showHelpCenter);
  const helpCenterSection = useGameStore((s) => s.helpCenterSection);
  const openHelpCenter = useGameStore((s) => s.openHelpCenter);
  const closeHelpCenter = useGameStore((s) => s.closeHelpCenter);
  const renderQuality = useGameStore((s) => s.renderQuality);
  const setRenderQuality = useGameStore((s) => s.setRenderQuality);
  const setRenderQualityManual = useGameStore((s) => s.setRenderQualityManual);
  const hapticsEnabled = useGameStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const audioEnabled = useGameStore((s) => s.audioEnabled);
  const setAudioEnabled = useGameStore((s) => s.setAudioEnabled);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const ambientVolume = useGameStore((s) => s.ambientVolume);
  const sfxVolume = useGameStore((s) => s.sfxVolume);
  const setMusicVolume = useGameStore((s) => s.setMusicVolume);
  const setAmbientVolume = useGameStore((s) => s.setAmbientVolume);
  const setSfxVolume = useGameStore((s) => s.setSfxVolume);
  const roamMode = useGameStore((s) => s.roamMode);
  const zoomLevel = useGameStore((s) => s.zoomLevel);
  const playerIndex = useGameStore((s) => s.playerIndex);
  const path = useGameStore((s) => s.path);
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const progress = path.length > 1 ? Math.round((playerIndex / (path.length - 1)) * 100) : 0;

  useEffect(() => {
    if (showHelpCenter) {
      if (mountedRef.current) return;
      mountedRef.current = true;
      setMounted(true);
      triggerHaptic('light');
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
      ]).start();
      return;
    }

    if (!mountedRef.current) return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      mountedRef.current = false;
      setMounted(false);
    });
  }, [fadeAnim, showHelpCenter, slideAnim]);

  const tileTypes = useMemo(
    () => [
      { key: 'red', ...TILE_VISUALS.red },
      { key: 'green', ...TILE_VISUALS.green },
      { key: 'blue', ...TILE_VISUALS.blue },
      { key: 'yellow', ...TILE_VISUALS.yellow },
    ],
    []
  );
  const activeSection: HelpCenterSection = SECTION_OPTIONS.some((option) => option.id === helpCenterSection)
    ? helpCenterSection
    : 'como-jogar';

  if (!mounted && !showHelpCenter) return null;

  return (
    <Modal
      visible={showHelpCenter}
      transparent
      animationType="none"
      onRequestClose={closeHelpCenter}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.overlay} edges={['bottom']}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeHelpCenter}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="Fechar central de ajuda"
            accessibilityHint="Fecha o painel de ajuda e retorna ao jogo"
          />
        </Animated.View>

        <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}> 
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppIcon name="book-open" size={18} color={COLORS.text} />
              <Text style={styles.headerTitle}>CENTRAL DE AJUDA</Text>
            </View>
            <TouchableOpacity
              onPress={closeHelpCenter}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fechar central de ajuda"
            >
              <AppIcon name="xmark" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionTabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionTabsContent}
            >
              {SECTION_OPTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[styles.sectionTab, isActive && styles.sectionTabActive]}
                    onPress={() => {
                      triggerHaptic('light');
                      openHelpCenter(section.id);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir secao ${section.title}`}
                    testID={`btn-help-section-${section.id}`}
                  >
                    <AppIcon
                      name={section.icon}
                      size={13}
                      color={isActive ? COLORS.text : COLORS.textMuted}
                    />
                    <Text style={[styles.sectionTabText, isActive && styles.sectionTabTextActive]}>
                      {section.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            testID="modal-help-center"
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentInner}
            showsVerticalScrollIndicator={false}
          >
            {activeSection === 'como-jogar' && (
              <View style={styles.sectionBody}>
                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="bullseye" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Objetivo</Text>
                  </View>
                  <Text style={styles.blockText}>
                    Seja a primeira pessoa a chegar ao final do tabuleiro aprendendo sobre prevenção combinada ao HIV/AIDS e outras infecções sexualmente transmissíveis.
                  </Text>
                </View>

                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="list-ol" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Passo a Passo</Text>
                  </View>
                  {[
                    'Toque no dado para rolar.',
                    'Avance o número de casas sorteado.',
                    'Leia a informação da casa atual.',
                    'Aplique o efeito da cor quando existir.',
                  ].map((step, index) => (
                    <View key={step} style={styles.stepRow}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="palette" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Legenda de Cores</Text>
                  </View>
                  {tileTypes.map((tile) => (
                    <View key={tile.key} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: tile.base }]}>
                        <AppIcon name={tile.icon} size={13} color={COLORS.text} />
                      </View>
                      <View style={styles.legendTextContainer}>
                        <Text style={styles.legendLabel}>{tile.label}</Text>
                        <Text style={styles.legendEffect}>{tile.effectLabel}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={[styles.block, styles.tipBlock]}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="lightbulb" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Dica Rápida</Text>
                  </View>
                  <Text style={styles.blockText}>
                    O conteúdo educativo de cada casa faz parte da experiência. Ler com atenção melhora as decisões durante a jornada.
                  </Text>
                </View>
              </View>
            )}

            {activeSection === 'controles' && (
              <View style={styles.sectionBody}>
                {[
                  {
                    icon: 'dice',
                    title: 'Rolar dado',
                    text: 'Aciona a jogada quando você não está se movendo.',
                  },
                  {
                    icon: 'video',
                    title: 'Camera (Seguir/Explorar)',
                    text: roamMode
                      ? 'Modo atual: Explorar. Toque em casas para abrir detalhes.'
                      : 'Modo atual: Seguir. A camera acompanha o personagem.',
                  },
                  {
                    icon: 'magnifying-glass-plus',
                    title: 'Zoom',
                    text: `Nível atual: ${zoomLevel}. Use + e - para ajustar a distância da câmera.`,
                  },
                  {
                    icon: 'clock-rotate-left',
                    title: 'Historico',
                    text: 'Mostra mensagens recentes da partida para consulta rápida.',
                  },
                  {
                    icon: 'shirt',
                    title: 'Personagem',
                    text: 'Abre a personalização visual do personagem.',
                  },
                ].map((item) => (
                  <View key={item.title} style={styles.controlCard}>
                    <View style={styles.controlTitleRow}>
                      <AppIcon name={item.icon} size={16} color={COLORS.text} />
                      <Text style={styles.controlTitle}>{item.title}</Text>
                    </View>
                    <Text style={styles.controlText}>{item.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {activeSection === 'qualidade' && (
              <View style={styles.sectionBody}>
                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="gauge-high" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Qualidade Gráfica</Text>
                  </View>
                  <View style={styles.qualityOptionsRow}>
                    {QUALITY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        testID={`btn-quality-${option.value}`}
                        style={[
                          styles.qualityOption,
                          renderQuality === option.value && styles.qualityOptionActive,
                        ]}
                        onPress={() => {
                          triggerHaptic('light');
                          setRenderQualityManual(option.value);
                        }}
                        activeOpacity={0.9}
                        accessibilityRole="button"
                        accessibilityLabel={`Definir qualidade ${option.label}`}
                      >
                        <Text
                          style={[
                            styles.qualityOptionText,
                            renderQuality === option.value && styles.qualityOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.qualityHint}>
                    O jogo também ajusta automaticamente a qualidade quando detecta queda de desempenho.
                  </Text>
                </View>

                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="sliders" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Ajustes Rápidos</Text>
                  </View>

                  <View style={styles.toggleRow}>
                    <View>
                      <Text style={styles.toggleTitle}>Som</Text>
                      <Text style={styles.toggleText}>Efeitos sonoros da interface e da partida.</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, audioEnabled && styles.toggleButtonOn]}
                      onPress={() => setAudioEnabled(!audioEnabled)}
                      accessibilityRole="button"
                      accessibilityLabel={audioEnabled ? 'Desativar som' : 'Ativar som'}
                    >
                      <Text style={styles.toggleButtonText}>{audioEnabled ? 'Ativo' : 'Inativo'}</Text>
                    </TouchableOpacity>
                  </View>

                  <VolumeSlider
                    icon="music"
                    title="Música"
                    description="Temas de menu, partida e celebração."
                    value={musicVolume}
                    onChange={setMusicVolume}
                    testID="slider-music-volume"
                  />

                  <VolumeSlider
                    icon="tree"
                    title="Ambiente"
                    description="Camada de fundo contínua da partida."
                    value={ambientVolume}
                    onChange={setAmbientVolume}
                    testID="slider-ambient-volume"
                  />

                  <VolumeSlider
                    icon="volume-high"
                    title="Efeitos"
                    description="Dado, passos, respostas e chegada."
                    value={sfxVolume}
                    onChange={setSfxVolume}
                    testID="slider-sfx-volume"
                  />

                  <View style={styles.toggleRow}>
                    <View>
                      <Text style={styles.toggleTitle}>Vibração</Text>
                      <Text style={styles.toggleText}>Resposta tátil ao interagir com botões.</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleButton, hapticsEnabled && styles.toggleButtonOn]}
                      onPress={() => setHapticsEnabled(!hapticsEnabled)}
                      accessibilityRole="button"
                      accessibilityLabel={hapticsEnabled ? 'Desativar vibracao' : 'Ativar vibracao'}
                    >
                      <Text style={styles.toggleButtonText}>{hapticsEnabled ? 'Ativo' : 'Inativo'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {activeSection === 'sobre' && (
              <View style={styles.sectionBody}>
                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="seedling" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Sobre o Projeto</Text>
                  </View>
                  <Text style={styles.blockText}>
                    MVP de jogo educativo para prevenção combinada ao HIV/AIDS e outras ISTs, com foco em aprendizado acessível e experiência mobile.
                  </Text>
                </View>

                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="chart-line" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Seu Progresso</Text>
                  </View>
                  <Text style={styles.blockText}>
                    Casa atual: {playerIndex + 1} de {Math.max(path.length, 1)} ({progress}% concluído).
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                </View>

                <View style={styles.block}>
                  <View style={styles.blockHeader}>
                    <AppIcon name="wand-magic-sparkles" size={18} color={COLORS.text} />
                    <Text style={styles.blockTitle}>Foco Atual</Text>
                  </View>
                  <Text style={styles.blockText}>
                    Clareza de interface, leitura facilitada do conteúdo educativo e mecânica de partida consistente em telas mobile.
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: Math.max(insets.bottom + 74, 88) }} />
          </ScrollView>

          <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 20 }]}> 
            <TouchableOpacity
              testID="btn-close-help-center"
              style={styles.understoodButton}
              onPress={closeHelpCenter}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Fechar central de ajuda"
            >
              <View style={styles.understoodButtonContent}>
                <Text style={styles.understoodButtonText}>FECHAR</Text>
                <AppIcon name="check" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
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
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: '#FFF8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  sectionTabsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#E6DFD7',
    backgroundColor: '#FFF',
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#D8CEC3',
    backgroundColor: '#FAF8F5',
  },
  sectionTabActive: {
    backgroundColor: '#FFEED8',
    borderColor: COLORS.cardBorder,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  sectionTabTextActive: {
    color: COLORS.text,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContentInner: {
    paddingTop: 16,
  },
  sectionBody: {
    gap: 12,
  },
  block: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E6DDD3',
    backgroundColor: '#FFF',
    padding: 14,
    gap: 10,
  },
  tipBlock: {
    backgroundColor: '#FFF7D8',
    borderColor: '#F6D777',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.4,
  },
  blockText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    fontWeight: '600',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#E7DDD2',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    padding: 10,
  },
  legendColor: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  legendEffect: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  controlCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E6DDD3',
    backgroundColor: '#FFF',
    padding: 14,
    gap: 8,
  },
  controlTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    color: COLORS.text,
  },
  qualityOptionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D8CEC3',
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  qualityOptionActive: {
    borderColor: COLORS.text,
    backgroundColor: '#FFF2DF',
  },
  qualityOptionText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  qualityOptionTextActive: {
    color: COLORS.text,
  },
  qualityHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFE7DE',
    paddingTop: 10,
    marginTop: 2,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  toggleText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 17,
    maxWidth: 210,
  },
  toggleButton: {
    minWidth: 86,
    height: 38,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
  },
  toggleButtonOn: {
    backgroundColor: '#DFF7DF',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  volumeControl: {
    borderTopWidth: 1,
    borderTopColor: '#EFE7DE',
    paddingTop: 12,
    gap: 10,
  },
  volumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  volumeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 9,
  },
  volumeTextGroup: {
    flex: 1,
  },
  volumeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.text,
  },
  volumeDescription: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  volumeValue: {
    minWidth: 42,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.text,
  },
  volumeSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeStepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D8CEC3',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
  },
  volumeTrack: {
    flex: 1,
    height: 8,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: '#E3DED8',
  },
  volumeTrackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  volumeThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: '#E3DED8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  bottomButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E6DDD3',
  },
  understoodButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  understoodButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  understoodButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
