"use client";

import { useState } from "react";
import { useLocalUser } from "@/hooks/useLocalUser";
import { UsernameModal } from "@/components/UsernameModal";
import { CreateDebateDialog } from "@/components/CreateDebateDialog";
import { SearchDebateDialog } from "@/components/SearchDebateDialog";
import { HistoryList } from "@/components/HistoryList";
import { AvailableDebatesList } from "@/components/AvailableDebatesList";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, loading, createUser } = useLocalUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  if (loading) return null;

  if (!user) {
    return <UsernameModal onCreate={createUser} />;
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">
        Hello <span className="text-accent">{user.name}</span>
      </h1>

      <div className="my-8 h-px bg-border" />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" size="lg" onClick={() => setCreateOpen(true)}>
          Create Debate
        </Button>
        <Button
          className="flex-1"
          size="lg"
          variant="secondary"
          onClick={() => setSearchOpen(true)}
        >
          Search Debate
        </Button>
      </div>

      <div className="my-8 h-px bg-border" />

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Available Debates</h2>
        <AvailableDebatesList />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">History</h2>
        <HistoryList />
      </section>

      <CreateDebateDialog user={user} open={createOpen} onClose={() => setCreateOpen(false)} />
      <SearchDebateDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </main>
  );
}
