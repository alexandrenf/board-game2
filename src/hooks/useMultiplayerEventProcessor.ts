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
  /**
   * Called when the resync retry cap is hit and the processor unconditionally
   * skips an event gap. Lets the parent force a fresh snapshot sync so the
   * runtime store can recover state lost to the skipped events.
   */
  onResyncGapSkipped?: () => void;
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
  onResyncGapSkipped,
}: UseMultiplayerEventProcessorParams): void => {
  const resyncCountRef = useRef(0);

  // Reset the retry counter when the room changes so a player who left
  // room A mid-resync doesn't carry the counter into room B and hit the
  // gap-skip path immediately.
  useEffect(() => {
    resyncCountRef.current = 0;
  }, [session?.roomId]);

  useEffect(() => {
    if (!eventsDelta || !session) return;
    if (eventsDelta.roomMissing) return;

    if (eventsDelta.requiresResync && roomStateLatestSequence != null) {
      if (resyncCountRef.current >= MAX_RESYNC_RETRIES) {
        console.warn(
          '[Multiplayer] max resync retries reached, skipping gap unconditionally',
          {
            from: processedSequenceRef.current,
            to: roomStateLatestSequence,
            gap: roomStateLatestSequence - processedSequenceRef.current,
          }
        );
        resyncCountRef.current = 0;
        const skipSeq = roomStateLatestSequence + 1;
        processedSequenceRef.current = skipSeq;
        setProcessedSequence(skipSeq);
        setEventsAfterSequence(skipSeq);
        // Trigger an explicit snapshot resync — any turn_started or
        // turn_resolved events that fell into the gap won't be applied via
        // the event handlers, so the runtime store must rebuild from the
        // server's current snapshot to recover.
        onResyncGapSkipped?.();
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
    onResyncGapSkipped,
  ]);
};
