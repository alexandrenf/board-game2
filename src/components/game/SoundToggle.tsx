import { AppIcon } from '@/src/components/ui/AppIcon';
import { audioManager } from '@/src/services/audio/audioManager';
import { theme } from '@/src/styles/theme';
import { triggerHaptic } from '@/src/utils/haptics';
import { useGameStore } from '@/src/game/state/gameState';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export const SoundToggle: React.FC = () => {
  const { audioEnabled, setAudioEnabled } = useGameStore();
  
  const handleToggle = async () => {
    triggerHaptic('light');
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) {
      await audioManager.play('switchA');
    }
  };
  
  return (
    <TouchableOpacity testID="btn-audio-toggle" style={styles.soundToggle} onPress={handleToggle}>
      <AppIcon
        name={audioEnabled ? 'volume-high' : 'volume-xmark'}
        size={theme.typography.fontSize.h5}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  soundToggle: theme.circularButton(44),
});
