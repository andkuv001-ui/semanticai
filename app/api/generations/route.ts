import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import {
  createGeneration,
  deleteGeneration,
  getAllGenerations,
} from "@/lib/models";
import { mockGenerations } from "@/lib/mock-data";
import { createGenerationSchema } from "@/lib/validation/generation";

export async function GET() {
  const dbAvailable = await isDatabaseAvailable();

  if (dbAvailable) {
    try {
      const generations = await getAllGenerations();
      return NextResponse.json(generations);
    } catch (error) {
      console.error("Ошибка получения истории генераций:", error);
      return NextResponse.json(
        { error: "Ошибка получения данных из DynamoDB" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(mockGenerations);
}

export async function POST(request: NextRequest) {
  const dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    return NextResponse.json(
      { error: "База данных недоступна в статическом режиме" },
      { status: 503 }
    );
  }

  try {
    const parsed = createGenerationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const generation = await createGeneration({
      id: crypto.randomUUID(),
      ...parsed.data,
    });

    return NextResponse.json(generation, { status: 201 });
  } catch (error) {
    console.error("Ошибка сохранения генерации:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения генерации" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    return NextResponse.json(
      { error: "База данных недоступна в статическом режиме" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Параметр id обязателен" },
        { status: 400 }
      );
    }

    await deleteGeneration(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления генерации:", error);
    return NextResponse.json(
      { error: "Ошибка удаления генерации" },
      { status: 500 }
    );
  }
}
