import { COLORS } from '@/src/constants/colors';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  const handleToggle = () => {
    triggerHaptic('light');
    setIsMuted(!isMuted);
  };
  
  return (
    <TouchableOpacity style={styles.soundToggle} onPress={handleToggle}>
      <Text style={styles.soundToggleIcon}>{isMuted ? '🔇' : '🔊'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  soundToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
  },
  soundToggleIcon: {
    fontSize: 20,
  },
});
