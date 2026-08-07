"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function UsernameModal({
  onCreate,
}: {
  onCreate: (name: string) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate(name.trim());
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open title="Welcome to DebateMe" hideClose>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm text-muted">What is your name?</label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mustapha"
            maxLength={40}
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </Button>
      </form>
    </Dialog>
  );
}
