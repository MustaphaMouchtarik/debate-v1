"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { HistoryEntry } from "@/types";

export function HistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rooms?scope=history")
      .then((res) => res.json())
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading history...</p>;
  if (history.length === 0) return <p className="text-sm text-muted">No finished debates yet.</p>;

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <Card key={entry.id} className="flex items-center justify-between p-4">
          <div>
            <h3 className="font-medium text-white">{entry.title}</h3>
            <p className="text-sm text-muted">
              Winner: <span className="text-accent">{entry.winnerName ?? "—"}</span>
              {entry.finishedAt && (
                <span> · {new Date(entry.finishedAt).toLocaleDateString()}</span>
              )}
            </p>
          </div>
          <Link
            href={`/history/${entry.id}`}
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            View Debate →
          </Link>
        </Card>
      ))}
    </div>
  );
}
