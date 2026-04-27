import { COLORS } from "@/src/constants/colors";
import { theme } from "@/src/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWAPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [deviceOS, setDeviceOS] = useState<"ios" | "android" | "desktop" | null>(null);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  const show = useCallback(() => {
    setIsVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 12,
    }).start();
  }, [slideAnim]);

  const hide = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 150,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setIsVisible(false);
    });
  }, [slideAnim]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    if (dismissed) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    if (isStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) setDeviceOS("ios");
    else if (isAndroid) setDeviceOS("android");
    else setDeviceOS("desktop");

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      installEventRef.current = e as BeforeInstallPromptEvent;
      setCanNativeInstall(true);
      show();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    if (isIOS || isAndroid) {
      show();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [show]);

  const handleDismiss = () => {
    hide();
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  const handleInstall = async () => {
    const event = installEventRef.current;
    if (!event) return;

    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") {
        hide();
      }
    } catch {
      hide();
    } finally {
      installEventRef.current = null;
      setCanNativeInstall(false);
    }
  };

  if (!isVisible) return null;

  const renderInstructions = () => {
    if (canNativeInstall) {
      return (
        <View style={styles.installRow}>
          <Pressable
            style={styles.installButton}
            onPress={handleInstall}
            accessibilityRole="button"
            accessibilityLabel="Instalar aplicativo"
          >
            <Ionicons name="download-outline" size={18} color={COLORS.cardBg} />
            <Text style={styles.installButtonText}>Instalar</Text>
          </Pressable>
          <Text style={styles.installHint}>
            Toque para adicionar à tela de início.
          </Text>
        </View>
      );
    }

    if (deviceOS === "ios") {
      return (
        <Text style={styles.description}>
          Toque em{" "}
          <Ionicons name="share-outline" size={16} color={COLORS.text} /> e depois
          em <Text style={styles.bold}>Adicionar à Tela de Início</Text> para a
          melhor experiência!
        </Text>
      );
    }

    if (deviceOS === "android") {
      return (
        <Text style={styles.description}>
          Toque em{" "}
          <Ionicons name="ellipsis-vertical" size={16} color={COLORS.text} /> e
          depois em <Text style={styles.bold}>Instalar app</Text> ou{" "}
          <Text style={styles.bold}>Adicionar à Tela de Início</Text>.
        </Text>
      );
    }

    return (
      <Text style={styles.description}>
        No navegador, use o menu{" "}
        <Ionicons name="ellipsis-vertical" size={16} color={COLORS.text} /> e
        selecione <Text style={styles.bold}>Instalar app</Text> ou{" "}
        <Text style={styles.bold}>Adicionar à Tela de Início</Text>.
      </Text>
    );
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >
      <View style={[theme.card, styles.card]}>
        <Pressable style={styles.closeBtn} onPress={handleDismiss} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="apps" size={32} color={COLORS.cardBg} />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Instalar aplicativo</Text>
            {renderInstructions()}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: theme.spacing.xl,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 9999,
  },
  card: {
    backgroundColor: COLORS.primary,
    flexDirection: "column",
    position: "relative",
    padding: theme.spacing.lg,
  },
  closeBtn: {
    position: "absolute",
    top: -theme.spacing.sm,
    right: -theme.spacing.sm,
    backgroundColor: COLORS.cardBg,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.cardBorder,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    ...theme.shadows.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.text,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.borderWidth.normal,
    borderColor: COLORS.text,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.h6,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: theme.spacing.xs,
    textTransform: "uppercase",
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: "500",
  },
  bold: {
    fontWeight: "800",
  },
  installRow: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  installButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: COLORS.text,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: COLORS.text,
    alignSelf: "flex-start",
  },
  installButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: "900",
    color: COLORS.cardBg,
    letterSpacing: theme.typography.letterSpacing.wide,
    textTransform: "uppercase",
  },
  installHint: {
    fontSize: theme.typography.fontSize.sm,
    color: COLORS.text,
    opacity: 0.75,
    fontWeight: "500",
  },
});