"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket-client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AppUser, DebateMessage, DebateRoomDetail } from "@/types";

const TOTAL_ROUNDS = 3;

export function DebateRoomChat({
  roomId,
  user,
  initialRoom,
}: {
  roomId: string;
  user: AppUser;
  initialRoom: DebateRoomDetail;
}) {
  const router = useRouter();
  const [room, setRoom] = useState<DebateRoomDetail>(initialRoom);
  const [draft, setDraft] = useState("");
  const [verdict, setVerdict] = useState<{ winnerName: string; reason: string } | null>(null);
  const [judging, setJudging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-room", { roomId, userId: user.id });

    socket.on("player-joined", (updated) => setRoom(updated));

    socket.on("message", (msg: DebateMessage) => {
      setRoom((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
    });

    socket.on("next-round", ({ round }) => {
      setRoom((prev) => ({ ...prev, currentRound: round }));
    });

    socket.on("debate-finished", () => {
      setRoom((prev) => ({ ...prev, status: "finished" }));
      setJudging(true);
    });

    socket.on("judge-complete", ({ winnerName, reason }) => {
      setJudging(false);
      setVerdict({ winnerName, reason });
    });

    socket.on("opponent-left", ({ winnerName, reason }) => {
      setJudging(false);
      setVerdict({ winnerName, reason });
    });

    socket.on("room-cancelled", () => {
      router.push("/");
    });

    socket.on("error", ({ message }) => {
      setJudging(false);
      setErrorMsg(message);
    });

    return () => {
      socket.off("player-joined");
      socket.off("message");
      socket.off("next-round");
      socket.off("debate-finished");
      socket.off("judge-complete");
      socket.off("opponent-left");
      socket.off("room-cancelled");
      socket.off("error");
    };
  }, [roomId, user.id, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [room.messages]);

  const isCreator = room.creatorId === user.id;
  const mySide = isCreator ? room.creatorSide : room.creatorSide === "FOR" ? "AGAINST" : "FOR";
  const opponentName = isCreator ? room.opponentName : room.creatorName;

  const roundMessages = room.messages.filter((m) => m.round === room.currentRound);
  const iSentThisRound = roundMessages.some((m) => m.authorId === user.id);
  const opponentSentThisRound = roundMessages.some((m) => m.authorId !== user.id && m.authorId);

  const canSend =
    room.status === "active" && !!room.opponentId && !iSentThisRound && draft.trim().length > 0;

  const waitingForOpponentToJoin = room.status === "waiting";
  const waitingForOpponentReply = room.status === "active" && iSentThisRound && !opponentSentThisRound;

  function handleSend() {
    if (!canSend) return;
    const socket = getSocket();
    socket.emit("send-message", { roomId, authorId: user.id, message: draft.trim() });
    setDraft("");
  }

  function handleQuit() {
    const isActive = room.status === "active";
    const confirmed = window.confirm(
      isActive
        ? "Leaving now will forfeit the debate — your opponent will be declared the winner. Quit anyway?"
        : "Cancel this debate and return home?"
    );
    if (!confirmed) return;

    const socket = getSocket();
    socket.emit("leave-room", { roomId, userId: user.id });
    router.push("/");
  }

  if (waitingForOpponentToJoin) {
    return (
      <Card className="mx-auto mt-16 max-w-md text-center">
        <p className="animate-pulseSoft text-muted">Waiting for another player...</p>
        <p className="mt-4 text-sm text-muted">Shareable Room ID</p>
        <code className="mt-1 block break-all rounded-lg bg-background px-3 py-2 text-xs text-accent">
          {roomId}
        </code>
        <Button variant="secondary" className="mt-6 w-full" onClick={handleQuit}>
          Cancel
        </Button>
      </Card>
    );
  }

  if (verdict) {
    return (
      <Card className="mx-auto mt-16 max-w-md text-center">
        <p className="text-sm uppercase tracking-wide text-muted">Winner</p>
        <h2 className="mt-2 text-2xl font-semibold text-accent">{verdict.winnerName}</h2>
        <div className="my-6 h-px bg-border" />
        <p className="text-sm uppercase tracking-wide text-muted">Reason</p>
        <p className="mt-2 text-sm text-white/90">{verdict.reason}</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-hover"
        >
          Return Home
        </a>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{room.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span>
              Your side: <span className="text-accent">{mySide}</span>
            </span>
            <span>Opponent: {opponentName}</span>
            <span>
              Round {room.currentRound} / {TOTAL_ROUNDS}
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={handleQuit}>
          Quit
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="thin-scroll flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface/50 p-4"
      >
        {room.messages.map((msg) => {
          const mine = msg.authorId === user.id;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-accent text-black" : "bg-background text-white"
                }`}
              >
                <p className="mb-1 text-xs opacity-70">
                  {mine ? "You" : msg.authorName} · Round {msg.round}
                </p>
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      {judging && (
        <p className="mt-3 animate-pulseSoft text-center text-sm text-muted">
          The AI judge is reviewing the debate...
        </p>
      )}

      {errorMsg && (
        <Card className="mt-3 text-center">
          <p className="text-sm text-red-400">{errorMsg}</p>
          <a
            href="/"
            className="mt-3 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-hover"
          >
            Return Home
          </a>
        </Card>
      )}

      {room.status === "active" && !judging && (
        <div className="mt-4 space-y-2">
          {waitingForOpponentReply && (
            <p className="animate-pulseSoft text-sm text-muted">Waiting for opponent...</p>
          )}
          <div className="flex gap-2">
            <Textarea
              rows={2}
              placeholder={iSentThisRound ? "Waiting for opponent..." : "Write your argument..."}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={iSentThisRound}
            />
            <Button onClick={handleSend} disabled={!canSend} className="self-end">
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
