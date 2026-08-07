import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Name is too long"),
});

// POST /api/users -> creates a temporary anonymous user (no auth, no password)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: { name: parsed.data.name },
    });

    return NextResponse.json({ id: user.id, name: user.name }, { status: 201 });
  } catch (err) {
    console.error("POST /api/users failed", err);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
