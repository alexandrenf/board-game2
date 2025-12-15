import { AppIcon } from '@/src/components/ui/AppIcon';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  
  const handleToggle = () => {
    triggerHaptic('light');
    setIsMuted(!isMuted);
  };
  
  return (
    <TouchableOpacity style={styles.soundToggle} onPress={handleToggle}>
      <AppIcon
        name={isMuted ? 'volume-xmark' : 'volume-high'}
        size={theme.typography.fontSize.h5}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  soundToggle: theme.circularButton(44),
});
