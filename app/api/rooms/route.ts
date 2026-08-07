import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRoom, listHistory, listWaitingRooms } from "@/lib/debate-service";

const createRoomSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(140, "Title is too long"),
  creatorId: z.string().uuid("Invalid user id"),
  creatorSide: z.enum(["FOR", "AGAINST"]),
});

// GET /api/rooms?scope=waiting|history
export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") ?? "waiting";
    if (scope === "history") {
      return NextResponse.json(await listHistory());
    }
    return NextResponse.json(await listWaitingRooms());
  } catch (err) {
    console.error("GET /api/rooms failed", err);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

// POST /api/rooms -> creates a new debate room in "waiting" status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const room = await createRoom(parsed.data);
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("POST /api/rooms failed", err);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
