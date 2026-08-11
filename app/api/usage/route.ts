import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import { getUsage, saveUsage } from "@/lib/models";
import { emptyUsage, mockUsage } from "@/lib/mock-data";
import { updateUsageSchema } from "@/lib/validation/usage";

export async function GET() {
  const dbAvailable = await isDatabaseAvailable();

  if (dbAvailable) {
    try {
      const usage = await getUsage();
      return NextResponse.json(usage ?? emptyUsage);
    } catch (error) {
      console.error("Ошибка получения счётчика использования ИИ:", error);
      return NextResponse.json(
        { error: "Ошибка получения данных из DynamoDB" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(mockUsage);
}

export async function PUT(request: NextRequest) {
  const dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    return NextResponse.json(
      { error: "База данных недоступна в статическом режиме" },
      { status: 503 }
    );
  }

  try {
    const parsed = updateUsageSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const usage = await saveUsage({
      id: "current",
      generationCount: parsed.data.generationCount,
      tokenCount: parsed.data.tokenCount,
      limit: parsed.data.limit,
    });

    return NextResponse.json(usage);
  } catch (error) {
    console.error("Ошибка обновления счётчика использования ИИ:", error);
    return NextResponse.json(
      { error: "Ошибка обновления счётчика" },
      { status: 500 }
    );
  }
}
