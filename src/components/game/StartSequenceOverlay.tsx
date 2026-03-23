import { AppIcon } from '@/src/components/ui/AppIcon';
import { COLORS } from '@/src/constants/colors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type StartSequencePlayer = {
  id: string;
  name: string;
  orderRoll?: number;
  orderRank?: number;
  isCurrentTurn: boolean;
};

type StartSequenceOverlayProps = {
  visible: boolean;
  players: StartSequencePlayer[];
  onComplete: () => void;
};

const PLAYER_LAYOUT = LinearTransition.springify().damping(16).stiffness(170);
const ROLL_TICK_MS = 110;
const REVEAL_START_MS = 900;
const REVEAL_GAP_MS = 320;
const REORDER_DELAY_MS = 260;
const COMPLETE_DELAY_MS = 1400;

const randomRoll = (): number => 1 + Math.floor(Math.random() * 6);

const toFinalOrder = (players: StartSequencePlayer[]): StartSequencePlayer[] =>
  [...players].sort((left, right) => {
    const leftRank = left.orderRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.orderRank ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;

    const leftRoll = left.orderRoll ?? 0;
    const rightRoll = right.orderRoll ?? 0;
    if (leftRoll !== rightRoll) return rightRoll - leftRoll;

    return left.name.localeCompare(right.name);
  });

const StartSequencePlayerCard: React.FC<{
  compact: boolean;
  highlight: boolean;
  player: StartSequencePlayer;
  rollValue: number;
  settled: boolean;
}> = ({ compact, highlight, player, rollValue, settled }) => {
  const spin = useSharedValue(0);
  const bob = useSharedValue(0);
  const emphasis = useSharedValue(0.95);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 650, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(bob);
    };
  }, [bob]);

  useEffect(() => {
    if (!settled) {
      spin.value = withRepeat(
        withTiming(1, { duration: 420, easing: Easing.linear }),
        -1,
        false
      );
      emphasis.value = withTiming(0.97, { duration: 160 });
      return;
    }

    cancelAnimation(spin);
    spin.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
    emphasis.value = withSpring(highlight ? 1.05 : 1, {
      damping: 10,
      stiffness: 190,
    });
  }, [emphasis, highlight, settled, spin]);

  const diceStyle = useAnimatedStyle(() => {
    const rotate = interpolate(spin.value, [0, 1], [0, 360]);
    const settleLift = interpolate(emphasis.value, [0.95, 1.05], [0, -4]);
    return {
      transform: [
        { perspective: 900 },
        { translateY: interpolate(bob.value, [0, 1], [0, -6]) + settleLift },
        { rotateX: `${rotate}deg` },
        { rotateY: `${rotate * 0.8}deg` },
        { scale: emphasis.value },
      ],
    };
  });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emphasis.value }],
  }));

  return (
    <Animated.View
      layout={PLAYER_LAYOUT}
      style={[
        styles.playerCard,
        compact && styles.playerCardCompact,
        highlight && styles.playerCardHighlight,
        cardStyle,
      ]}
    >
      <Animated.View style={[styles.diceBlock, compact && styles.diceBlockCompact, diceStyle]}>
        <View style={styles.diceFace}>
          <Text style={[styles.diceValue, compact && styles.diceValueCompact]}>
            {rollValue}
          </Text>
        </View>
        <View style={styles.diceShadow} />
      </Animated.View>

      <Text numberOfLines={1} style={[styles.playerName, compact && styles.playerNameCompact]}>
        {player.name}
      </Text>

      <View style={[styles.rankPill, highlight && styles.rankPillHighlight]}>
        <Text style={styles.rankPillText}>
          {player.orderRank ?? 0}º na ordem
        </Text>
      </View>

      {highlight || player.isCurrentTurn ? (
        <View style={styles.currentTurnBadge}>
          <AppIcon name="sparkles" size={11} color="#FFF" />
          <Text style={styles.currentTurnBadgeText}>Comeca aqui</Text>
        </View>
      ) : null}
    </Animated.View>
  );
};

export const StartSequenceOverlay: React.FC<StartSequenceOverlayProps> = ({
  visible,
  players,
  onComplete,
}) => {
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [orderedPlayers, setOrderedPlayers] = useState(players);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [displayRolls, setDisplayRolls] = useState<Record<string, number>>({});
  const [hasReordered, setHasReordered] = useState(false);
  const revealedIdsRef = useRef<string[]>([]);
  const playersRef = useRef(players);

  const orderedPlayerIds = useMemo(
    () => orderedPlayers.map((player) => player.id),
    [orderedPlayers]
  );
  const playersSignature = useMemo(
    () =>
      players
        .map((player) => `${player.id}:${player.orderRoll ?? 0}:${player.orderRank ?? 0}`)
        .join('|'),
    [players]
  );

  useEffect(() => {
    playersRef.current = players;
  }, [playersSignature, players]);

  useEffect(() => {
    const sequencePlayers = playersRef.current;
    if (!visible || sequencePlayers.length === 0) return;

    const initialPlayers = [...sequencePlayers];
    const finalOrder = toFinalOrder(sequencePlayers);
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    setOrderedPlayers(initialPlayers);
    setHasReordered(false);
    revealedIdsRef.current = [];
    setRevealedIds([]);
    setDisplayRolls(
      Object.fromEntries(initialPlayers.map((player) => [player.id, randomRoll()]))
    );

    const interval = setInterval(() => {
      setDisplayRolls((current) =>
        Object.fromEntries(
          initialPlayers.map((player) => [
            player.id,
            revealedIdsRef.current.includes(player.id)
              ? current[player.id] ?? player.orderRoll ?? 1
              : randomRoll(),
          ])
        )
      );
    }, ROLL_TICK_MS);

    initialPlayers.forEach((player, index) => {
      timeouts.push(
        setTimeout(() => {
          setRevealedIds((current) => {
            if (current.includes(player.id)) return current;
            const next = [...current, player.id];
            revealedIdsRef.current = next;
            return next;
          });
          setDisplayRolls((current) => ({
            ...current,
            [player.id]: player.orderRoll ?? 1,
          }));
        }, REVEAL_START_MS + index * REVEAL_GAP_MS)
      );
    });

    const reorderAt = REVEAL_START_MS + initialPlayers.length * REVEAL_GAP_MS + REORDER_DELAY_MS;
    timeouts.push(
        setTimeout(() => {
          setHasReordered(true);
          setOrderedPlayers(finalOrder);
          revealedIdsRef.current = finalOrder.map((player) => player.id);
          setRevealedIds(finalOrder.map((player) => player.id));
        }, reorderAt)
      );

    timeouts.push(
      setTimeout(() => {
        onComplete();
      }, reorderAt + COMPLETE_DELAY_MS)
    );

    return () => {
      clearInterval(interval);
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [onComplete, playersSignature, visible]);

  if (!visible || players.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <View style={styles.backdrop} />

      <View style={[styles.panel, compact && styles.panelCompact]}>
        <View style={styles.headerRow}>
          <View style={styles.headerBadge}>
            <AppIcon name="dice-d6" size={14} color={COLORS.text} />
            <Text style={styles.headerBadgeText}>ORDEM DA PARTIDA</Text>
          </View>
          <Text style={styles.headerTitle}>Quem joga primeiro?</Text>
          <Text style={styles.headerSubtitle}>
            {hasReordered
              ? 'A ordem final está definida. O primeiro turno vai começar.'
              : 'Os dados estão rolando para decidir a ordem dos jogadores.'}
          </Text>
        </View>

        <View style={styles.playersRow}>
          {orderedPlayers.map((player, index) => (
            <StartSequencePlayerCard
              key={player.id}
              compact={compact}
              highlight={hasReordered && index === 0}
              player={player}
              rollValue={displayRolls[player.id] ?? player.orderRoll ?? 1}
              settled={revealedIds.includes(player.id)}
            />
          ))}
        </View>

        <Text style={styles.footerHint}>
          {hasReordered
            ? `${orderedPlayers[0]?.name ?? 'Jogador'} abre a rodada.`
            : `${orderedPlayerIds.length} jogadores disputando a primeira vez.`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    zIndex: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(14, 8, 5, 0.58)',
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255, 247, 236, 0.94)',
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  panelCompact: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
  },
  headerRow: {
    alignItems: 'center',
    gap: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFF2DE',
    borderWidth: 1,
    borderColor: '#E9C99F',
  },
  headerBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#2D1B0F',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#6D4F34',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'nowrap',
  },
  playerCard: {
    flex: 1,
    minWidth: 76,
    maxWidth: 118,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#E1C4A4',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  playerCardCompact: {
    minWidth: 68,
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 12,
    borderRadius: 18,
    gap: 8,
  },
  playerCardHighlight: {
    borderColor: '#F7931E',
    backgroundColor: '#FFF5E7',
  },
  diceBlock: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceBlockCompact: {
    width: 50,
    height: 50,
  },
  diceFace: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#5A3A22',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  diceValue: {
    color: '#2D1B0F',
    fontSize: 24,
    fontWeight: '900',
  },
  diceValueCompact: {
    fontSize: 20,
  },
  diceShadow: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  playerName: {
    color: '#2D1B0F',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  playerNameCompact: {
    fontSize: 12,
  },
  rankPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F8EFE4',
    borderWidth: 1,
    borderColor: '#E3CDB2',
  },
  rankPillHighlight: {
    backgroundColor: '#F7931E',
    borderColor: '#D17C16',
  },
  rankPillText: {
    color: '#5C3B23',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  currentTurnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  currentTurnBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  footerHint: {
    color: '#6D4F34',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
