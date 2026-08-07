"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AppUser, Side } from "@/types";

export function CreateDebateDialog({
  user,
  open,
  onClose,
}: {
  user: AppUser;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [side, setSide] = useState<Side>("FOR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (title.trim().length < 3) {
      setError("Give your debate a real title.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), creatorId: user.id, creatorSide: side }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create debate");
      }
      const room = await res.json();
      router.push(`/room/${room.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Create Debate">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm text-muted">Debate Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Should AI replace software engineers?"
            maxLength={140}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-muted">Choose your side</label>
          <div className="flex gap-3">
            {(["FOR", "AGAINST"] as Side[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSide(option)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                  side === option
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-background text-muted hover:text-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button className="w-full" onClick={handleCreate} disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </Dialog>
  );
}
