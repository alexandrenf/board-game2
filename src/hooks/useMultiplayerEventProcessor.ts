import { TurnAnimationScript } from '@/src/game/runtime/types';
import { parseTurnScript } from '@/src/services/multiplayer/turnScriptUtils';
import { MutableRefObject, useEffect, useRef } from 'react';

const MAX_RESYNC_RETRIES = 3;

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
  applyTurnResolved: (script: TurnAnimationScript, options?: { awaitingQuiz?: boolean }) => void;
  applyTurnStarted: (playerId: string) => void;
  applyQuizStarted: (payload: unknown) => void;
  applyQuizResolved: (payload: unknown) => void;
  dismissQuizFeedback: () => void;
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
  applyQuizStarted,
  applyQuizResolved,
  dismissQuizFeedback,
}: UseMultiplayerEventProcessorParams): void => {
  const resyncCountRef = useRef(0);

  useEffect(() => {
    if (!eventsDelta || !session) return;
    if (eventsDelta.roomMissing) return;

    if (eventsDelta.requiresResync && roomStateLatestSequence != null) {
      if (resyncCountRef.current >= MAX_RESYNC_RETRIES) {
        console.warn('Max resync retries reached, skipping gap unconditionally');
        resyncCountRef.current = 0;
        const skipSeq = roomStateLatestSequence + 1;
        processedSequenceRef.current = skipSeq;
        setProcessedSequence(skipSeq);
        setEventsAfterSequence(skipSeq);
        return;
      }
      resyncCountRef.current += 1;
      const resyncSequence = Math.max(processedSequenceRef.current, roomStateLatestSequence);
      processedSequenceRef.current = resyncSequence;
      setProcessedSequence(resyncSequence);
      setEventsAfterSequence(resyncSequence);
      return;
    }

    resyncCountRef.current = 0;
    let nextProcessedSequence = processedSequenceRef.current;

    const sortedEvents = [...eventsDelta.events].sort((a, b) => a.sequence - b.sequence);

    for (const event of sortedEvents) {
      if (event.sequence <= nextProcessedSequence) continue;

      const payload = toRecord(event.payload);

      if (event.type === 'turn_resolved') {
        const script = parseTurnScript(payload);
        if (script) {
          applyTurnResolved(script, { awaitingQuiz: payload.awaitingQuiz === true });
        }
      } else if (event.type === 'turn_started') {
        if (typeof payload.playerId === 'string') {
          applyTurnStarted(payload.playerId);
        }
      } else if (event.type === 'quiz_started') {
        applyQuizStarted(payload);
      } else if (event.type === 'quiz_resolved') {
        applyQuizResolved(payload);
      } else if (event.type === 'quiz_cancelled') {
        dismissQuizFeedback();
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
    applyQuizStarted,
    applyQuizResolved,
    dismissQuizFeedback,
    eventsDelta,
    roomStateLatestSequence,
    session,
    setEventsAfterSequence,
    setProcessedSequence,
    processedSequenceRef,
  ]);
};
