import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/colors';
import { theme } from '@/src/styles/theme';

export const PWAPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | null>(null);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if dismissed
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) return;

    // Check if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || // Standard
      (window.navigator as any).standalone || // iOS Safari
      document.referrer.includes('android-app://'); // Android

    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) setDeviceOS('ios');
    else if (isAndroid) setDeviceOS('android');

    // Show prompt if mobile web
    if (isIOS || isAndroid) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 12,
      }).start();
    }
  }, []);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      if (Platform.OS === 'web') {
        localStorage.setItem('pwa_prompt_dismissed', 'true');
      }
    });
  };

  if (!isVisible || !deviceOS) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[theme.card, styles.card]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="apps" size={32} color={COLORS.cardBg} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Install App</Text>
            {deviceOS === 'ios' ? (
              <Text style={styles.description}>
                Tap <Ionicons name="share-outline" size={16} color={COLORS.text} /> and then{' '}
                <Text style={styles.bold}>"Add to Home Screen"</Text> for the best experience!
              </Text>
            ) : (
              <Text style={styles.description}>
                Tap <Ionicons name="ellipsis-vertical" size={16} color={COLORS.text} /> and then{' '}
                <Text style={styles.bold}>"Install app"</Text> or <Text style={styles.bold}>"Add to Home Screen"</Text>.
              </Text>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 9999,
  },
  card: {
    backgroundColor: COLORS.primary, // Vibrant background to catch attention
    flexDirection: 'column',
    position: 'relative',
    padding: theme.spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: -theme.spacing.sm,
    right: -theme.spacing.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.cardBorder,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...theme.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.text,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.h6,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: '500',
  },
  bold: {
    fontWeight: '800',
  },
});
