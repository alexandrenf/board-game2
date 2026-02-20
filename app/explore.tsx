import { HelpCenterModal } from '@/src/components/game/HelpCenterModal';
import { COLORS } from '@/src/constants/colors';
import { useGameStore } from '@/src/game/state/gameState';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export default function ExploreCompatScreen() {
  const openHelpCenter = useGameStore((state) => state.openHelpCenter);

  useEffect(() => {
    openHelpCenter('sobre');
  }, [openHelpCenter]);

  return (
    <View testID="screen-explore-redirect" style={styles.container}>
      <HelpCenterModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
