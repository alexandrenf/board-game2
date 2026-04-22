import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const TOAST_VISIBLE_MS = 2400;

interface MessageToastProps {
  message: string | null;
  bottomOffset?: number;
}

export const MessageToast: React.FC<MessageToastProps> = ({ message, bottomOffset = 120 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconSpin = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Determine icon, color, and entrance style based on message content
  const getMessageStyle = (msg: string | null) => {
    if (!msg) return { iconName: 'comment-dots', color: COLORS.primary, entrance: 'slide' as const };
    if (msg.includes('Tirou')) return { iconName: 'dice', color: COLORS.secondary, entrance: 'bounce' as const };
    if (msg.includes('Chegou')) return { iconName: 'location-dot', color: COLORS.accent, entrance: 'slide' as const };
    if (msg.includes('Rolando')) return { iconName: 'hourglass-half', color: COLORS.info, entrance: 'bounce' as const };
    if (msg.includes('Bem-vindo')) return { iconName: 'handshake-simple', color: COLORS.primary, entrance: 'slide' as const };
    return { iconName: 'comment-dots', color: COLORS.primary, entrance: 'slide' as const };
  };

  const { iconName, color, entrance } = getMessageStyle(message);
  const backgroundColor = color.startsWith('#') ? `${color}CC` : color;

  useEffect(() => {
    if (message && message !== prevMessage.current) {
      setVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      iconSpin.setValue(0);
      progressAnim.setValue(1);

      // Icon entrance animation
      Animated.spring(iconSpin, {
        toValue: 1,
        useNativeDriver: true,
        speed: 16,
        bounciness: 14,
      }).start();

      // Progress bar countdown
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: TOAST_VISIBLE_MS + 260, // match display time
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      const entranceConfig = entrance === 'bounce'
        ? { speed: 14, bounciness: 18 }
        : { speed: 18, bounciness: 10 };

      Animated.sequence([
        Animated.parallel([
          Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 12,
          }),
          Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            ...entranceConfig,
          }),
        ]),
        Animated.delay(TOAST_VISIBLE_MS),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 2, duration: 260, useNativeDriver: true }),
        ]),
      ]).start(() => setVisible(false));
      prevMessage.current = message;
    } else if (!message) {
      setVisible(false);
    }
  }, [message, fadeAnim, slideAnim, iconSpin, progressAnim, entrance]);

  if (!message || !visible) return null;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: entrance === 'bounce' ? [0, 0, 150] : [52, 0, 150],
  });

  const entryScale = entrance === 'bounce'
    ? slideAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.5, 1, 0.9] })
    : fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  // Icon spin/bounce entrance
  const iconScale = iconSpin.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const iconRotate = iconSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '0deg'],
  });

  // Progress bar width
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.messageToast,
        { backgroundColor },
        { bottom: bottomOffset },
        {
          opacity: fadeAnim,
          transform: [
            { scale: entryScale },
            { translateX },
          ],
        }
      ]}
    >
      <View style={[styles.messageAccent, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
      <Animated.View
        style={[
          styles.messageIconWrap,
          {
            transform: [
              { scale: iconScale },
              { rotate: iconRotate },
            ],
          },
        ]}
      >
        <AppIcon name={iconName} size={16} color="#FFF" />
      </Animated.View>
      <View style={styles.messageTextContainer}>
        <Text style={styles.messageTitle}>Atualização</Text>
        <Text style={styles.messageText} numberOfLines={2}>{message}</Text>
      </View>
      {/* Progress countdown bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: 'rgba(255,255,255,0.5)' }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageToast: {
    position: 'absolute',
    right: 16,
    maxWidth: '78%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    zIndex: 10,
    pointerEvents: 'none',
  },
  messageAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    opacity: 0.6,
  },
  messageIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageTextContainer: { gap: 2, flex: 1 },
  messageTitle: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.92,
  },
  messageText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    lineHeight: 18,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 4,
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
});
