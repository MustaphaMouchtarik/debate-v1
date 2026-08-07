"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { DebateRoomDetail } from "@/types";

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<DebateRoomDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/rooms/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Debate not found");
        return res.json();
      })
      .then(setRoom)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-8 text-center text-red-400">{error}</p>;
  if (!room) return <p className="p-8 text-center text-muted">Loading...</p>;

  const rounds = [1, 2, 3].map((round) => ({
    round,
    messages: room.messages.filter((m) => m.round === round),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-accent hover:text-accent-hover">
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">{room.title}</h1>

      <Card className="mt-4">
        <p className="text-sm uppercase tracking-wide text-muted">Winner</p>
        <p className="mt-1 text-lg font-medium text-accent">{room.winnerName ?? "—"}</p>
        <div className="my-4 h-px bg-border" />
        <p className="text-sm uppercase tracking-wide text-muted">AI Explanation</p>
        <p className="mt-1 text-sm text-white/90">{room.aiReason ?? "No explanation recorded."}</p>
      </Card>

      <div className="mt-8 space-y-6">
        {rounds.map(({ round, messages }) => (
          <div key={round}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Round {round}
            </h2>
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className="p-4">
                  <p className="mb-1 text-xs text-muted">{msg.authorName}</p>
                  <p className="text-sm text-white/90">{msg.message}</p>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
