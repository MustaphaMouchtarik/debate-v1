export type Side = "FOR" | "AGAINST";
export type RoomStatus = "waiting" | "active" | "finished";

export interface AppUser {
  id: string;
  name: string;
}

export interface DebateMessage {
  id: string;
  roomId: string;
  authorId: string;
  authorName: string;
  round: number;
  message: string;
  createdAt: string;
}

export interface DebateRoomSummary {
  id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  creatorSide: Side;
  status: RoomStatus;
  createdAt: string;
}

export interface DebateRoomDetail extends DebateRoomSummary {
  opponentId: string | null;
  opponentName: string | null;
  currentRound: number;
  startedAt: string | null;
  finishedAt: string | null;
  winnerId: string | null;
  winnerName: string | null;
  aiReason: string | null;
  messages: DebateMessage[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  winnerName: string | null;
  finishedAt: string | null;
}

// Socket.io event payloads
export interface ServerToClientEvents {
  "player-joined": (room: DebateRoomDetail) => void;
  message: (message: DebateMessage) => void;
  "next-round": (payload: { round: number }) => void;
  "debate-finished": (payload: { round: number }) => void;
  "judge-complete": (payload: {
    winnerId: string;
    winnerName: string;
    reason: string;
  }) => void;
  "opponent-left": (payload: {
    winnerId: string;
    winnerName: string;
    reason: string;
  }) => void;
  "room-cancelled": () => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  "join-room": (payload: { roomId: string; userId: string }) => void;
  "send-message": (payload: { roomId: string; authorId: string; message: string }) => void;
  "leave-room": (payload: { roomId: string; userId: string }) => void;
}
