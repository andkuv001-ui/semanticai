import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateCore } from "@/lib/server/generate-core";

const generateSchema = z.object({
  topic: z.string().trim().min(1).max(300),
});

export async function POST(request: NextRequest) {
  const parsed = generateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await generateCore(parsed.data.topic);
  return NextResponse.json(result);
}
