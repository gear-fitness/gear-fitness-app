import {
  Conversation,
  ConversationParticipant,
} from "../../../api/messageService";

/** Members of a conversation other than the current user. */
export function otherParticipants(
  conversation: Conversation,
  myUserId: string,
): ConversationParticipant[] {
  return conversation.participants.filter((p) => p.userId !== myUserId);
}

/** Display name for a conversation row / thread header. */
export function conversationTitle(
  conversation: Conversation,
  myUserId: string,
): string {
  if (conversation.type === "GROUP") {
    if (conversation.title) return conversation.title;
    const names = otherParticipants(conversation, myUserId).map(
      (p) => p.displayName || p.username,
    );
    return names.length ? names.join(", ") : "Group";
  }
  const other = otherParticipants(conversation, myUserId)[0];
  return other ? other.displayName || other.username : "Unknown";
}

/** One-line preview of the most recent message for the inbox list. */
export function messagePreview(conversation: Conversation): string {
  const m = conversation.lastMessage;
  if (!m) return "No messages yet";
  if (m.deleted) return "Message deleted";
  if (m.content) return m.content;
  if (m.mediaKeys && m.mediaKeys.length > 0) return "📷 Photo";
  return "";
}

/** Two messages belong to the same visual run: same sender, within 5 minutes. */
export function sameRun(
  a: { senderId: string; createdAt: string } | undefined,
  b: { senderId: string; createdAt: string } | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.senderId !== b.senderId) return false;
  const gap = Math.abs(
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return gap < 5 * 60 * 1000;
}

export function isSameDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Separator label for a day of messages: "Today", "Yesterday", or a date. */
export function dayLabel(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(iso, now.toISOString())) return "Today";
  if (isSameDay(iso, yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

/**
 * A new message "session" starts a centered separator: no previous message, a
 * different calendar day, or a gap larger than SESSION_GAP. Instagram shows the
 * time above a batch of messages rather than on every bubble, and this is what
 * decides where that batch begins.
 */
const SESSION_GAP_MS = 60 * 60 * 1000; // 1 hour

export function startsNewSession(
  prev: { createdAt: string } | undefined,
  cur: { createdAt: string } | undefined,
): boolean {
  if (!cur) return false;
  if (!prev) return true;
  if (!isSameDay(prev.createdAt, cur.createdAt)) return true;
  const gap = Math.abs(
    new Date(cur.createdAt).getTime() - new Date(prev.createdAt).getTime(),
  );
  return gap >= SESSION_GAP_MS;
}

/**
 * Centered separator label for the top of a message session — the day (Today /
 * Yesterday / date) plus the clock time, e.g. "Today 9:41 AM", "Mar 3 2:15 PM".
 */
export function sessionLabel(iso?: string | null): string {
  if (!iso) return "";
  const day = dayLabel(iso);
  const time = clockTime(iso);
  if (!day) return time;
  if (!time) return day;
  return `${day} ${time}`;
}

/** Clock time shown on the last message of a run (e.g. "9:41 AM"). */
export function clockTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Short relative timestamp (e.g. "3m", "2h", "5d") for inbox rows. */
export function shortTime(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  return `${wk}w`;
}
