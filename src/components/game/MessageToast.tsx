import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

interface MessageToastProps {
  message: string | null;
}

export const MessageToast: React.FC<MessageToastProps> = ({ message }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevMessage = useRef(message);
  
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
  
  useEffect(() => {
    if (message && message !== prevMessage.current) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.spring(fadeAnim, { 
          toValue: 1, 
          useNativeDriver: true,
          speed: 20,
          bounciness: 12,
        }),
      ]).start();
      prevMessage.current = message;
    }
  }, [message, fadeAnim]);
  
  if (!message) return null;
  
  return (
    <Animated.View 
      style={[
        styles.messageToast,
        { backgroundColor: color },
        {
          opacity: fadeAnim,
          transform: [
            { scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
            { translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }
          ],
        }
      ]}
    >
      <AppIcon name={iconName} size={16} color="#FFF" />
      <Text style={styles.messageText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  messageToast: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.text,
    zIndex: 10,
  },
  messageText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
