import { useEffect, useRef } from 'react';

const PRESENCE_INTERVAL_MS = 20_000;

type UsePresenceHeartbeatParams = {
  session: { roomId: string } | null;
  clientId: string | null;
  activePlayerId: string | null;
  touchPresence: (args: { roomId: string; playerId: string; clientId: string }) => Promise<unknown>;
};

/**
 * Sends a periodic presence heartbeat to the server while the player is in a room.
 * The interval is 20 seconds, matching the server's heartbeat expectation.
 */
export const usePresenceHeartbeat = ({
  session,
  clientId,
  activePlayerId,
  touchPresence,
}: UsePresenceHeartbeatParams): void => {
  const touchPresenceRef = useRef(touchPresence);
  touchPresenceRef.current = touchPresence;
  const roomId = session?.roomId ?? null;

  useEffect(() => {
    if (!roomId || !clientId || !activePlayerId) return;

    const sendHeartbeat = () =>
      touchPresenceRef.current({
        roomId,
        playerId: activePlayerId,
        clientId,
      }).catch(() => {
        // Failures are handled by the next room snapshot which will detect the stale presence.
      });

    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, PRESENCE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activePlayerId, clientId, roomId]);
};
