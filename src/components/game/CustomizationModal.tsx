import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    triggerHaptic('light');
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
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalEmoji}>✨</Text>
            <Text style={styles.modalTitle}>Personalizar</Text>
          </View>
          
          <View style={styles.modalTabs}>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'shirt' && styles.modalTabActive]}
              onPress={() => handleTabChange('shirt')}
            >
              <Text style={[styles.modalTabText, activeTab === 'shirt' && styles.modalTabTextActive]}>
                👕 ROUPA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'hair' && styles.modalTabActive]}
              onPress={() => handleTabChange('hair')}
            >
              <Text style={[styles.modalTabText, activeTab === 'hair' && styles.modalTabTextActive]}>
                💇 CABELO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalTab, activeTab === 'skin' && styles.modalTabActive]}
              onPress={() => handleTabChange('skin')}
            >
              <Text style={[styles.modalTabText, activeTab === 'skin' && styles.modalTabTextActive]}>
                👶 PELE
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.colorGrid}>
              {(activeTab === 'shirt' ? shirtColors : activeTab === 'hair' ? hairColors : skinColors).map(({ color }) => (
                <AnimatedButton 
                  key={color}
                  onPress={() => handleColorSelect(color)}
                  hapticStyle="light"
                >
                  <View style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    (activeTab === 'shirt' ? shirtColor : activeTab === 'hair' ? hairColor : skinColor) === color && styles.colorOptionSelected,
                  ]}>
                    {(activeTab === 'shirt' ? shirtColor : activeTab === 'hair' ? hairColor : skinColor) === color && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </View>
                </AnimatedButton>
              ))}
            </View>
          </View>

          <AnimatedButton 
            style={styles.startButton} 
            onPress={() => {
              triggerHaptic('success');
              setShowCustomization(false);
            }}
            hapticStyle="success"
          >
            <View style={styles.startButtonInner}>
              <Text style={styles.startButtonText}>SALVAR</Text>
            </View>
          </AnimatedButton>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(78, 52, 46, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    borderWidth: 3,
    borderColor: COLORS.text,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#F6F1EB',
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
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
  modalTabTextActive: { fontWeight: '900', color: COLORS.text },
  modalBody: { minHeight: 140, justifyContent: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  colorOption: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: 'transparent',
    justifyContent: 'center', alignItems: 'center'
  },
  colorOptionSelected: { borderColor: COLORS.text, transform: [{scale:1.1}] },
  checkMark: { color: '#FFF', fontSize: 24, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  startButton: { marginTop: 20 },
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
