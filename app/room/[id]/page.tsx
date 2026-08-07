"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useLocalUser } from "@/hooks/useLocalUser";
import { DebateRoomChat } from "@/components/DebateRoomChat";
import type { DebateRoomDetail } from "@/types";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: userLoading } = useLocalUser();
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

  if (userLoading || (!room && !error)) {
    return <p className="p-8 text-center text-muted">Loading debate...</p>;
  }

  if (error) {
    return <p className="p-8 text-center text-red-400">{error}</p>;
  }

  if (!user) {
    return <p className="p-8 text-center text-muted">Please set your name from the homepage first.</p>;
  }

  return <DebateRoomChat roomId={id} user={user} initialRoom={room!} />;
}
