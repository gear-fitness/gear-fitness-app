import { Client, IMessage } from "@stomp/stompjs";
import { getAccessToken } from "../utils/auth";
import { Message } from "../api/messageService";

/**
 * Singleton STOMP-over-WebSocket client for direct messaging. The backend pushes
 * every event for the current user to `/user/queue/messages`; screens subscribe
 * via `onDmEvent`. REST remains the source of truth — this is a best-effort live
 * layer, so consumers refetch over REST on reconnect (`onDmStatus`).
 *
 * Note: @stomp/stompjs relies on the global `WebSocket` (provided by RN) and
 * `TextEncoder`/`TextDecoder` (present in Hermes on RN 0.83). If a future runtime
 * lacks them, import a `text-encoding` polyfill in `index.tsx`.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "";

// Verbose socket logging to the Metro console. Flip to true to debug the
// connection (logs the ws url, CONNECT/close/errors, and every inbound event).
const DEBUG = false;
const log = (...args: unknown[]) => {
  if (DEBUG) console.log("[dm]", ...args);
};

// http(s)://host:8080  ->  ws(s)://host:8080/ws
function wsUrl(): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
}

export type DmEvent = {
  type: "message" | "seen" | "typing" | "accepted" | "left";
  conversationId: string;
  message?: Message;
  userId?: string;
  username?: string;
  lastReadMessageId?: string;
  typing?: boolean;
};

type EventHandler = (e: DmEvent) => void;
type StatusHandler = (connected: boolean) => void;

let client: Client | null = null;
const eventHandlers = new Set<EventHandler>();
const statusHandlers = new Set<StatusHandler>();

export function connectDmSocket(): void {
  if (client || !API_BASE_URL) return;

  const c = new Client({
    webSocketFactory: () => new WebSocket(wsUrl()),
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // React Native's WebSocket prefers binary frames and can drop the trailing
    // NULL terminator; these two make @stomp/stompjs parse RN frames reliably
    // (without them the socket opens but CONNECTED/MESSAGE frames never parse,
    // so onConnect and subscriptions silently never fire).
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    debug: (str) => log("stomp:", str),
    // Re-read the token before every (re)connect so a refreshed access token is
    // used after expiry.
    beforeConnect: async () => {
      const token = await getAccessToken();
      log("connecting to", wsUrl(), "token?", !!token);
      c.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      log("CONNECTED");
      c.subscribe("/user/queue/messages", (msg: IMessage) => {
        try {
          const event: DmEvent = JSON.parse(msg.body);
          log("event:", event.type, event.conversationId);
          eventHandlers.forEach((h) => h(event));
        } catch (e) {
          log("bad frame", e);
        }
      });
      statusHandlers.forEach((h) => h(true));
    },
    onStompError: (frame) => {
      log("STOMP ERROR", frame.headers?.["message"], frame.body);
      statusHandlers.forEach((h) => h(false));
    },
    onWebSocketError: (evt) => {
      log("WS ERROR", (evt as { message?: string })?.message ?? evt);
    },
    onWebSocketClose: (evt) => {
      log("WS CLOSED", (evt as { code?: number })?.code);
      statusHandlers.forEach((h) => h(false));
    },
  });

  client = c;
  c.activate();
}

export function disconnectDmSocket(): void {
  if (client) {
    void client.deactivate();
    client = null;
  }
}

/** Subscribe to incoming DM events. Returns an unsubscribe function. */
export function onDmEvent(handler: EventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/** Subscribe to connection status changes (true = connected). */
export function onDmStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  return () => {
    statusHandlers.delete(handler);
  };
}

/** Publish a typing start/stop for a conversation (no-op if not connected). */
export function sendTyping(conversationId: string, typing: boolean): void {
  if (client?.connected) {
    client.publish({
      destination: `/app/conversation.${conversationId}.typing`,
      body: JSON.stringify({ typing }),
    });
  }
}
