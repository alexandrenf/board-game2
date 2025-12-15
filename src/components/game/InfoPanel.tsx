import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import { TILE_VISUALS } from '@/src/game/constants';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export const InfoPanel: React.FC = () => {
  const { showInfoPanel, setShowInfoPanel } = useGameStore();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showInfoPanel) {
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
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showInfoPanel, slideAnim, fadeAnim]);

  const handleClose = () => {
    triggerHaptic('light');
    setShowInfoPanel(false);
  };

  const tileTypes = [
    { key: 'red', ...TILE_VISUALS.red },
    { key: 'green', ...TILE_VISUALS.green },
    { key: 'blue', ...TILE_VISUALS.blue },
    { key: 'yellow', ...TILE_VISUALS.yellow },
  ];

  return (
    <Modal
      visible={showInfoPanel}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppIcon name="book-open" size={18} color={COLORS.text} />
              <Text style={styles.headerTitle}>COMO JOGAR</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <AppIcon name="xmark" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Objective Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="bullseye" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>OBJETIVO</Text>
              </View>
              <Text style={styles.sectionText}>
                Seja o primeiro a chegar ao final do tabuleiro aprendendo sobre prevenção combinada ao HIV/AIDS e outras infecções sexualmente transmissíveis!
              </Text>
            </View>

            {/* How to Play Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="dice" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>COMO JOGAR</Text>
              </View>
              <View style={styles.stepsList}>
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>1</Text>
                  <Text style={styles.stepText}>Toque no dado para rolar</Text>
                </View>
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>2</Text>
                  <Text style={styles.stepText}>Mova o número de casas do resultado</Text>
                </View>
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>3</Text>
                  <Text style={styles.stepText}>Leia a informação da casa</Text>
                </View>
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>4</Text>
                  <Text style={styles.stepText}>Aplique o efeito (se houver)</Text>
                </View>
              </View>
            </View>

            {/* Color Legend Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppIcon name="palette" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>LEGENDA DAS CORES</Text>
              </View>
              <View style={styles.legendList}>
                {tileTypes.map((tile) => (
                  <View key={tile.key} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: tile.base }]}>
                      <AppIcon name={tile.icon} size={14} color={COLORS.text} />
                    </View>
                    <View style={styles.legendTextContainer}>
                      <Text style={styles.legendLabel}>{tile.label}</Text>
                      <View style={styles.legendEffectRow}>
                        <AppIcon name="arrow-right" size={12} color={COLORS.textMuted} />
                        <Text style={styles.legendEffect}>{tile.effectLabel}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Tips Section */}
            <View style={[styles.section, styles.tipsSection]}>
              <View style={styles.sectionHeader}>
                <AppIcon name="lightbulb" size={20} color={COLORS.text} />
                <Text style={styles.sectionTitle}>DICAS</Text>
              </View>
              <Text style={styles.sectionText}>
                Este jogo é educativo! Cada casa contém informações importantes sobre prevenção. 
                Leia com atenção e aprenda enquanto joga.
              </Text>
            </View>

            {/* Spacer for bottom button */}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              style={styles.understoodButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <View style={styles.understoodButtonContent}>
                <Text style={styles.understoodButtonText}>ENTENDI!</Text>
                <AppIcon name="thumbs-up" size={14} color="#FFF" />
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: 1,
  },
  sectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  stepsList: {
    gap: 10,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  legendList: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  legendColor: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  legendEffect: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 0,
  },
  legendEffectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FAE8A4',
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  understoodButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  understoodButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  understoodButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
