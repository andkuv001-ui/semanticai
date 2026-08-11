import { Sparkles } from "lucide-react";
import { SemanticCoreGenerator } from "@/components/semantic-core-generator";
import { UsageCounter } from "@/components/usage-counter";
import { UsageProvider } from "@/components/usage-provider";
import { isDatabaseAvailable } from "@/lib/db";
import { isYandexGptConfigured } from "@/lib/yandexgpt";
import { getAllGenerations, getAllFavorites, getUsage } from "@/lib/models";
import {
  emptyUsage,
  mockFavorites,
  mockGenerations,
  mockUsage,
} from "@/lib/mock-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialGenerations = mockGenerations;
  let initialFavorites = mockFavorites;
  let initialUsage = mockUsage;
  const dbAvailable = await isDatabaseAvailable();

  if (dbAvailable) {
    try {
      initialGenerations = await getAllGenerations();
    } catch (error) {
      console.error("Ошибка получения истории генераций:", error);
    }
    try {
      initialFavorites = await getAllFavorites();
    } catch (error) {
      console.error("Ошибка получения избранного:", error);
    }
    try {
      const usage = await getUsage();
      initialUsage = usage ?? emptyUsage;
    } catch (error) {
      console.error("Ошибка получения счётчика использования ИИ:", error);
    }
  }

  return (
    <div className="pattern-grid min-h-[calc(100vh-9rem)] px-4 py-16">
      <div className="container mx-auto max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-4 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Генератор семантического ядра
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Введите тему продажи — сформируем набор ключевых слов и поисковых
            запросов для объявлений на Авито.
          </p>
        </div>
        <UsageProvider initialUsage={initialUsage} dbAvailable={dbAvailable}>
          <UsageCounter />
          <SemanticCoreGenerator
            initialGenerations={initialGenerations}
            initialFavorites={initialFavorites}
            dbAvailable={dbAvailable}
            yandexGptConfigured={isYandexGptConfigured()}
          />
        </UsageProvider>
      </div>
    </div>
  );
}
