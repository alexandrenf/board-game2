import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface MessageToastProps {
  message: string | null;
  bottomOffset?: number;
}

export const MessageToast: React.FC<MessageToastProps> = ({ message, bottomOffset = 120 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);
  
  // Determine icon and color based on message content
  const getMessageStyle = (msg: string | null) => {
    if (!msg) return { iconName: 'comment-dots', color: COLORS.primary };
    if (msg.includes('Tirou')) return { iconName: 'dice', color: COLORS.secondary };
    if (msg.includes('Chegou')) return { iconName: 'location-dot', color: COLORS.accent };
    if (msg.includes('Rolando')) return { iconName: 'hourglass-half', color: COLORS.info };
    if (msg.includes('Bem-vindo')) return { iconName: 'handshake-simple', color: COLORS.primary };
    return { iconName: 'comment-dots', color: COLORS.primary };
  };
  
  const { iconName, color } = getMessageStyle(message);
  const backgroundColor = color.startsWith('#') ? `${color}CC` : color;
  
  useEffect(() => {
    if (message && message !== prevMessage.current) {
      setVisible(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
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
            speed: 18,
            bounciness: 10,
          }),
        ]),
        Animated.delay(2400),
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 2, duration: 260, useNativeDriver: true }),
        ]),
      ]).start(() => setVisible(false));
      prevMessage.current = message;
    } else if (!message) {
      setVisible(false);
    }
  }, [message, fadeAnim, slideAnim]);
  
  if (!message || !visible) return null;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [16, 0, 120],
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
            { scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            { translateX },
          ],
        }
      ]}
      pointerEvents="none"
    >
      <View style={[styles.messageAccent, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
      <View style={styles.messageIconWrap}>
        <AppIcon name={iconName} size={16} color="#FFF" />
      </View>
      <View style={styles.messageTextContainer}>
        <Text style={styles.messageTitle}>Atualização</Text>
        <Text style={styles.messageText} numberOfLines={2}>{message}</Text>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    zIndex: 10,
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
  messageTextContainer: { gap: 2 },
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
});
