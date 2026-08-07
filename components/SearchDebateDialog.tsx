"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DebateRoomSummary } from "@/types";

export function SearchDebateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [rooms, setRooms] = useState<DebateRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/rooms?scope=waiting")
      .then((res) => res.json())
      .then(setRooms)
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Available Debates" className="max-w-lg">
      <div className="thin-scroll max-h-[60vh] space-y-3 overflow-y-auto">
        {loading && <p className="text-sm text-muted">Loading debates...</p>}
        {!loading && rooms.length === 0 && (
          <p className="text-sm text-muted">No debates waiting right now. Create one!</p>
        )}
        {rooms.map((room) => (
          <Card key={room.id} className="p-4">
            <h3 className="font-medium text-white">{room.title}</h3>
            <p className="mt-1 text-sm text-muted">Created by {room.creatorName}</p>
            <p className="text-sm text-muted">
              Creator argues <span className="text-accent">{room.creatorSide}</span>
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => router.push(`/room/${room.id}`)}
            >
              Join
            </Button>
          </Card>
        ))}
      </div>
    </Dialog>
  );
}
