import "server-only";

import { z } from "zod";
import {
  generateSemanticCore,
  estimateFrequency,
  type CoreItem,
  type GeneratedCore,
} from "@/lib/semantic-core";
import { callRouterAi, isRouterAiConfigured } from "@/lib/routerai";

/**
 * Генерация семантического ядра и оценка частотности.
 *
 * Когда на сервере задан API-ключ RouterAI (см. lib/routerai.ts), ядро и
 * частотность формируются моделью. Если ключ не задан, модель недоступна или
 * ответ не удалось разобрать — используется прежняя приблизительная логика из
 * lib/semantic-core.ts, чтобы приложение продолжало работать без ошибок.
 */

const SYSTEM_PROMPT =
  "Ты — авитолог и SEO-специалист. По заданной теме продажи составь " +
  "семантическое ядро для размещения объявлений на Авито: набор релевантных " +
  "ключевых слов и поисковых запросов. Для каждого элемента дай " +
  "приблизительную частотность — примерное число поисковых запросов в месяц " +
  "в России (число от 50 до 100000). Сгенерируй 10–15 ключевых слов и " +
  "10–15 поисковых запросов, релевантных теме и ориентированных на Авито " +
  "(купить, недорого, оптом, цена, бу и т.п.). " +
  "Верни ТОЛЬКО валидный JSON без пояснений и без разметки в формате: " +
  '{"keywords":[{"word":"...","frequency":12000}],"queries":[{"word":"...","frequency":5000}]}';

const itemSchema = z.object({
  word: z.string().trim().min(1).max(300),
  frequency: z.preprocess(
    (value) => Number(value),
    z.number().finite().nonnegative()
  ),
});

const modelCoreSchema = z.object({
  keywords: z.array(itemSchema).min(1).max(200),
  queries: z.array(itemSchema).min(1).max(200),
});

/** Извлекает и разбирает JSON из ответа модели (устойчиво к обрамлению). */
function parseModelCore(raw: string): z.infer<typeof modelCoreSchema> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }

  const result = modelCoreSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Нормализует элементы ядра: нижний регистр, схлопывание пробелов, дедуп. */
function toCoreItems(
  items: Array<{ word: string; frequency: number }>
): CoreItem[] {
  const seen = new Set<string>();
  const result: CoreItem[] = [];
  for (const item of items) {
    const word = item.word.toLowerCase().replace(/\s+/g, " ").trim();
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const frequency = Math.max(50, Math.round(item.frequency / 50) * 50);
    result.push({ word, frequency });
  }
  return result;
}

/** Приблизительная генерация через прежнюю логику (без модели). */
function generateApproximate(rawTopic: string): GeneratedCore {
  const core = generateSemanticCore(rawTopic);
  if (!core) {
    const topic = rawTopic.trim().replace(/\s+/g, " ");
    return { topic, keywords: [], queries: [], usedModel: false };
  }
  return {
    topic: core.topic,
    keywords: core.keywords.map((word) => ({
      word,
      frequency: estimateFrequency(word, core.topic),
    })),
    queries: core.queries.map((word) => ({
      word,
      frequency: estimateFrequency(word, core.topic),
    })),
    usedModel: false,
  };
}

/** Генерация ядра и частотности, используя модель, если ключ задан. */
export async function generateCore(rawTopic: string): Promise<GeneratedCore> {
  const topic = rawTopic.trim().replace(/\s+/g, " ");
  if (!topic) return generateApproximate(topic);

  if (isRouterAiConfigured()) {
    const result = await callRouterAi(`Тема продажи: ${topic}`, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 3000,
    });

    const parsed = result ? parseModelCore(result.text) : null;
    if (parsed) {
      return {
        topic,
        keywords: toCoreItems(parsed.keywords),
        queries: toCoreItems(parsed.queries),
        usedModel: true,
      };
    }
  }

  return generateApproximate(topic);
}
