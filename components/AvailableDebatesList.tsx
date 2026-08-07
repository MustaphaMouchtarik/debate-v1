"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DebateRoomSummary } from "@/types";

export function AvailableDebatesList() {
  const router = useRouter();
  const [rooms, setRooms] = useState<DebateRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rooms?scope=waiting")
      .then((res) => res.json())
      .then(setRooms)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading debates...</p>;
  if (rooms.length === 0) return <p className="text-sm text-muted">No debates waiting right now.</p>;

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <Card key={room.id} className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-medium text-white">{room.title}</h3>
            <p className="text-sm text-muted">
              Created by {room.creatorName} · Creator argues{" "}
              <span className="text-accent">{room.creatorSide}</span>
            </p>
          </div>
          <Button size="sm" onClick={() => router.push(`/room/${room.id}`)}>
            Join
          </Button>
        </Card>
      ))}
    </div>
  );
}
