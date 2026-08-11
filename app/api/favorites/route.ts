import { NextRequest, NextResponse } from "next/server";
import { isDatabaseAvailable } from "@/lib/db";
import { addFavorite, getAllFavorites, removeFavorite } from "@/lib/models";
import { mockFavorites } from "@/lib/mock-data";
import { createFavoriteSchema } from "@/lib/validation/favorite";

export async function GET() {
  const dbAvailable = await isDatabaseAvailable();

  if (dbAvailable) {
    try {
      const favorites = await getAllFavorites();
      return NextResponse.json(favorites);
    } catch (error) {
      console.error("Ошибка получения избранного:", error);
      return NextResponse.json(
        { error: "Ошибка получения данных из DynamoDB" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(mockFavorites);
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
    const parsed = createFavoriteSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Некорректные данные", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const favorite = await addFavorite(
      parsed.data.keyword,
      parsed.data.sourceGenerationId
    );

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Ошибка сохранения избранного:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения избранного" },
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
    const keyword = searchParams.get("keyword");

    if (!keyword) {
      return NextResponse.json(
        { error: "Параметр keyword обязателен" },
        { status: 400 }
      );
    }

    await removeFavorite(keyword);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ошибка удаления избранного:", error);
    return NextResponse.json(
      { error: "Ошибка удаления избранного" },
      { status: 500 }
    );
  }
}
