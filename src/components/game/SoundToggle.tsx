import { theme } from '@/src/styles/theme';
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
  soundToggle: theme.circularButton(44),
  soundToggleIcon: {
    fontSize: theme.typography.fontSize.h5,
  },
});
