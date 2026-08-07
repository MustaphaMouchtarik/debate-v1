import { NextRequest, NextResponse } from "next/server";
import { getRoomDetail } from "@/lib/debate-service";

// GET /api/rooms/:id -> full room detail including messages (used for room + history view)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await getRoomDetail(id);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (err) {
    console.error("GET /api/rooms/[id] failed", err);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}
