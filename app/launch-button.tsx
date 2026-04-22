import { Launch3DButton } from '@/src/components/ui/Launch3DButton';
import { BRAND } from '@/src/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LaunchButtonScreen() {
  const insets = useSafeAreaInsets();
  const [pressCount, setPressCount] = useState(0);

  return (
    <LinearGradient
      colors={['#F8F2E7', '#EAF6F0', '#F6E7CA']}
      locations={[0, 0.48, 1]}
      style={styles.root}
      testID="screen-launch-button"
    >
      <View style={styles.previewSpace} pointerEvents="none">
        <View style={styles.previewHalo} />
      </View>

      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 18) + 12 }]}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{pressCount}</Text>
        </View>
        <Launch3DButton onPress={() => setPressCount((count) => count + 1)} testID="launch3d_button" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  previewSpace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHalo: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(0, 148, 68, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(0, 148, 68, 0.12)',
  },
  bottomDock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingHorizontal: 24,
    backgroundColor: '#F7EBD9',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#4E2C17',
    shadowColor: '#4E2C17',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 12,
    ...Platform.select({
      web: {
        minHeight: 350,
      },
      default: {
        minHeight: 330,
      },
    }),
  },
  statusPill: {
    position: 'absolute',
    top: 14,
    right: 22,
    minWidth: 38,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: BRAND.orange,
    borderWidth: 2,
    borderColor: '#4E2C17',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
