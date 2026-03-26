import { TurnAnimationScript } from '@/src/game/runtime/types';
import { parseTurnScript } from '@/src/services/multiplayer/turnScriptUtils';
import { MutableRefObject, useEffect } from 'react';

type RoomEvent = {
  id: string;
  sequence: number;
  type: string;
  payload?: unknown;
};

type EventsDeltaResult = {
  roomMissing: boolean;
  latestSequence: number;
  hasMore: boolean;
  requiresResync: boolean;
  events: RoomEvent[];
};

const toRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

type UseMultiplayerEventProcessorParams = {
  session: { roomId: string } | null;
  eventsDelta: EventsDeltaResult | undefined;
  roomStateLatestSequence: number | undefined;
  processedSequenceRef: MutableRefObject<number>;
  setProcessedSequence: (seq: number) => void;
  setEventsAfterSequence: (seq: number) => void;
  applyTurnResolved: (script: TurnAnimationScript) => void;
  applyTurnStarted: (playerId: string) => void;
};

/**
 * Processes incoming room event deltas and applies them to the runtime store.
 * Handles resync requests and deduplicates events by sequence number.
 */
export const useMultiplayerEventProcessor = ({
  session,
  eventsDelta,
  roomStateLatestSequence,
  processedSequenceRef,
  setProcessedSequence,
  setEventsAfterSequence,
  applyTurnResolved,
  applyTurnStarted,
}: UseMultiplayerEventProcessorParams): void => {
  useEffect(() => {
    if (!eventsDelta || !session) return;
    if (eventsDelta.roomMissing) return;

    if (eventsDelta.requiresResync && roomStateLatestSequence != null) {
      const resyncSequence = Math.max(processedSequenceRef.current, roomStateLatestSequence);
      processedSequenceRef.current = resyncSequence;
      setProcessedSequence(resyncSequence);
      setEventsAfterSequence(resyncSequence);
      return;
    }

    let nextProcessedSequence = processedSequenceRef.current;

    for (const event of eventsDelta.events) {
      if (event.sequence <= nextProcessedSequence) continue;

      const payload = toRecord(event.payload);

      if (event.type === 'turn_resolved') {
        const script = parseTurnScript(payload);
        if (script) {
          applyTurnResolved(script);
        }
      } else if (event.type === 'turn_started') {
        if (typeof payload.playerId === 'string') {
          applyTurnStarted(payload.playerId);
        }
      }

      nextProcessedSequence = event.sequence;
    }

    if (nextProcessedSequence === processedSequenceRef.current) return;

    processedSequenceRef.current = nextProcessedSequence;
    setProcessedSequence(nextProcessedSequence);
    setEventsAfterSequence(nextProcessedSequence);
  }, [
    applyTurnResolved,
    applyTurnStarted,
    eventsDelta,
    roomStateLatestSequence,
    session,
    setEventsAfterSequence,
    setProcessedSequence,
    processedSequenceRef,
  ]);
};
