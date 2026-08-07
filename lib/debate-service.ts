import { prisma } from "@/lib/prisma";
import { judgeDebate } from "@/lib/openai";
import type {
  DebateMessage,
  DebateRoomDetail,
  DebateRoomSummary,
  HistoryEntry,
  Side,
} from "@/types";

const TOTAL_ROUNDS = 3;

function toSummary(room: {
  id: string;
  title: string;
  creatorId: string;
  creator: { name: string };
  creatorSide: string;
  status: string;
  createdAt: Date;
}): DebateRoomSummary {
  return {
    id: room.id,
    title: room.title,
    creatorId: room.creatorId,
    creatorName: room.creator.name,
    creatorSide: room.creatorSide as Side,
    status: room.status as DebateRoomSummary["status"],
    createdAt: room.createdAt.toISOString(),
  };
}

function toMessage(m: {
  id: string;
  roomId: string;
  authorId: string;
  author: { name: string };
  round: number;
  message: string;
  createdAt: Date;
}): DebateMessage {
  return {
    id: m.id,
    roomId: m.roomId,
    authorId: m.authorId,
    authorName: m.author.name,
    round: m.round,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function createRoom(params: {
  title: string;
  creatorId: string;
  creatorSide: Side;
}): Promise<DebateRoomDetail> {
  const room = await prisma.debateRoom.create({
    data: {
      title: params.title,
      creatorId: params.creatorId,
      creatorSide: params.creatorSide,
    },
    include: { creator: true, opponent: true, winner: true, messages: true },
  });

  return getRoomDetail(room.id) as Promise<DebateRoomDetail>;
}

export async function listWaitingRooms(): Promise<DebateRoomSummary[]> {
  const rooms = await prisma.debateRoom.findMany({
    where: { status: "waiting" },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
  return rooms.map(toSummary);
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const rooms = await prisma.debateRoom.findMany({
    where: { status: "finished" },
    include: { winner: true },
    orderBy: { finishedAt: "desc" },
  });
  return rooms.map(
    (r: { id: string; title: string; winner: { name: string } | null; finishedAt: Date | null }) => ({
      id: r.id,
      title: r.title,
      winnerName: r.winner?.name ?? null,
      finishedAt: r.finishedAt ? r.finishedAt.toISOString() : null,
    })
  );
}

export async function getRoomDetail(roomId: string): Promise<DebateRoomDetail | null> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: roomId },
    include: {
      creator: true,
      opponent: true,
      winner: true,
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!room) return null;

  return {
    ...toSummary(room),
    opponentId: room.opponentId,
    opponentName: room.opponent?.name ?? null,
    currentRound: room.currentRound,
    startedAt: room.startedAt ? room.startedAt.toISOString() : null,
    finishedAt: room.finishedAt ? room.finishedAt.toISOString() : null,
    winnerId: room.winnerId,
    winnerName: room.winner?.name ?? null,
    aiReason: room.aiReason,
    messages: room.messages.map(toMessage),
  };
}

/**
 * Joins a waiting room. The joiner automatically takes the opposite side
 * from the creator. Returns null if the room can't be joined.
 */
export async function joinRoom(roomId: string, userId: string): Promise<DebateRoomDetail | null> {
  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } });
  if (!room || room.status !== "waiting") return null;
  if (room.creatorId === userId) return null; // can't join your own debate

  await prisma.debateRoom.update({
    where: { id: roomId },
    data: {
      opponentId: userId,
      status: "active",
      startedAt: new Date(),
    },
  });

  return getRoomDetail(roomId);
}

/**
 * Adds a message for the given round, enforcing one message per player per round.
 * Returns the created message plus whether the round advanced / debate finished.
 */
export async function addMessage(params: {
  roomId: string;
  authorId: string;
  message: string;
}): Promise<{
  message: DebateMessage;
  roundAdvancedTo: number | null;
  debateFinished: boolean;
}> {
  const room = await prisma.debateRoom.findUnique({
    where: { id: params.roomId },
    include: { messages: true },
  });

  if (!room) throw new Error("Room not found");
  if (room.status !== "active") throw new Error("Room is not active");
  if (params.authorId !== room.creatorId && params.authorId !== room.opponentId) {
    throw new Error("User is not a participant in this room");
  }

  const round = room.currentRound;
  const alreadySent = room.messages.some(
    (m: { round: number; authorId: string }) =>
      m.round === round && m.authorId === params.authorId
  );
  if (alreadySent) throw new Error("You already sent your message for this round");

  const created = await prisma.message.create({
    data: {
      roomId: room.id,
      authorId: params.authorId,
      round,
      message: params.message,
    },
    include: { author: true },
  });

  const messagesThisRound =
    room.messages.filter((m: { round: number }) => m.round === round).length + 1;
  let roundAdvancedTo: number | null = null;
  let debateFinished = false;

  if (messagesThisRound >= 2) {
    if (round >= TOTAL_ROUNDS) {
      await prisma.debateRoom.update({
        where: { id: room.id },
        data: { status: "finished", finishedAt: new Date() },
      });
      debateFinished = true;
    } else {
      const nextRound = round + 1;
      await prisma.debateRoom.update({
        where: { id: room.id },
        data: { currentRound: nextRound },
      });
      roundAdvancedTo = nextRound;
    }
  }

  return { message: toMessage(created), roundAdvancedTo, debateFinished };
}

/**
 * Runs the AI judge over the full transcript once the debate has ended,
 * then persists the verdict on the room.
 */
export async function judgeAndFinishRoom(roomId: string): Promise<{
  winnerId: string;
  winnerName: string;
  reason: string;
}> {
  const detail = await getRoomDetail(roomId);
  if (!detail) throw new Error("Room not found");
  if (!detail.opponentId || !detail.opponentName) throw new Error("Room has no opponent");

  const verdict = await judgeDebate({
    topic: detail.title,
    player1: { name: detail.creatorName, side: detail.creatorSide },
    player2: {
      name: detail.opponentName,
      side: detail.creatorSide === "FOR" ? "AGAINST" : "FOR",
    },
    conversation: detail.messages.map((m) => ({
      authorName: m.authorName,
      round: m.round,
      message: m.message,
    })),
  });

  const winnerId = verdict.winner === "player1" ? detail.creatorId : detail.opponentId;
  const winnerName = verdict.winner === "player1" ? detail.creatorName : detail.opponentName;

  await prisma.debateRoom.update({
    where: { id: roomId },
    data: { winnerId, aiReason: verdict.reason },
  });

  return { winnerId, winnerName, reason: verdict.reason };
}

export type LeaveRoomResult =
  | { type: "cancelled" }
  | { type: "forfeit"; winnerId: string; winnerName: string; reason: string }
  | { type: "noop" };

/**
 * Called when a player quits a room. Behavior depends on room state:
 * - "waiting": no opponent yet, so the room is simply cancelled (deleted).
 *   Only the creator (the only person who could be in it) can trigger this.
 * - "active": the leaving player forfeits; the remaining player is declared
 *   the winner so they aren't left waiting forever.
 * - "finished" (debate already concluded, or judging failed/hung): quitting
 *   here is a no-op for everyone else — we must NOT broadcast a cancellation,
 *   since that would incorrectly kick a player who is legitimately viewing
 *   their result screen back to the homepage.
 */
export async function leaveRoom(roomId: string, userId: string): Promise<LeaveRoomResult> {
  const room = await prisma.debateRoom.findUnique({ where: { id: roomId } });
  if (!room) return { type: "noop" };

  if (room.status === "waiting") {
    if (room.creatorId !== userId) return { type: "noop" }; // only the creator can cancel
    await prisma.debateRoom.delete({ where: { id: roomId } });
    return { type: "cancelled" };
  }

  if (room.status === "active") {
    const isParticipant = room.creatorId === userId || room.opponentId === userId;
    if (!isParticipant) return { type: "noop" };

    const detail = await getRoomDetail(roomId);
    if (!detail || !detail.opponentId || !detail.opponentName) return { type: "noop" };

    const winnerId = userId === detail.creatorId ? detail.opponentId : detail.creatorId;
    const winnerName = userId === detail.creatorId ? detail.opponentName : detail.creatorName;
    const reason = "The opponent left the debate before it finished.";

    await prisma.debateRoom.update({
      where: { id: roomId },
      data: { status: "finished", finishedAt: new Date(), winnerId, aiReason: reason },
    });

    return { type: "forfeit", winnerId, winnerName, reason };
  }

  // Room is already "finished" (verdict reached, or AI judging failed and it's
  // stuck) — nothing to broadcast. The leaving client still navigates home on
  // its own; other participants are left undisturbed.
  return { type: "noop" };
}
