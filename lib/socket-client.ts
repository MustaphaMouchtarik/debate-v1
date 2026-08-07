"use client";

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

// Reuse a single socket connection across the app instead of reconnecting per component.
export function getSocket() {
  if (!socket) {
    socket = io({ path: "/socket.io" });
  }
  return socket;
}
