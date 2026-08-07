import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import {
  addMessage,
  getRoomDetail,
  joinRoom,
  judgeAndFinishRoom,
  leaveRoom,
} from "../lib/debate-service";
import type { ClientToServerEvents, ServerToClientEvents } from "../types";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    // Client joins a specific room's socket.io channel and, if this is the
    // second participant, actually joins the debate (opponent assignment).
    socket.on("join-room", async ({ roomId, userId }) => {
      try {
        socket.join(roomId);

        const existing = await getRoomDetail(roomId);
        if (!existing) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // If this user is neither the creator nor an existing opponent, and
        // the room is still waiting, they become the opponent -> room goes active.
        const isParticipant =
          existing.creatorId === userId || existing.opponentId === userId;

        if (!isParticipant && existing.status === "waiting") {
          const updated = await joinRoom(roomId, userId);
          if (updated) {
            io.to(roomId).emit("player-joined", updated);
            return;
          }
        }

        // Participant reconnecting, or a spectator viewing history — just
        // send them current state.
        io.to(roomId).emit("player-joined", existing);
      } catch (err) {
        console.error("join-room failed", err);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // A player sends their single message for the current round.
    socket.on(
      "send-message",
      async (payload) => {
        try {
          const { roomId, authorId, message } = payload;
          const result = await addMessage({ roomId, authorId, message });

          io.to(roomId).emit("message", result.message);

          if (result.roundAdvancedTo) {
            io.to(roomId).emit("next-round", { round: result.roundAdvancedTo });
          }

          if (result.debateFinished) {
            io.to(roomId).emit("debate-finished", { round: 3 });
            try {
              const verdict = await judgeAndFinishRoom(roomId);
              io.to(roomId).emit("judge-complete", verdict);
            } catch (err) {
              console.error("AI judging failed", err);
              io.to(roomId).emit("error", {
                message: "The AI judge failed to reach a verdict. Please try again.",
              });
            }
          }
        } catch (err: any) {
          console.error("send-message failed", err);
          socket.emit("error", { message: err?.message ?? "Failed to send message" });
        }
      }
    );

    socket.on("leave-room", async ({ roomId, userId }) => {
      try {
        const result = await leaveRoom(roomId, userId);
        if (result.type === "forfeit") {
          io.to(roomId).emit("opponent-left", {
            winnerId: result.winnerId,
            winnerName: result.winnerName,
            reason: result.reason,
          });
        } else if (result.type === "cancelled") {
          io.to(roomId).emit("room-cancelled");
        }
        // "noop" (room already finished, or user wasn't a real participant):
        // nothing to broadcast — the leaving client navigates home on its own.
        socket.leave(roomId);
      } catch (err) {
        console.error("leave-room failed", err);
        socket.emit("error", { message: "Failed to leave room" });
      }
    });

    socket.on("disconnect", () => {
      // Anonymous, stateless users — nothing to clean up server-side.
    });
  });

  httpServer.listen(port, () => {
    console.log(`> DebateMe ready on http://localhost:${port}`);
  });
});
