export interface SemanticCore {
  topic: string;
  keywords: string[];
  queries: string[];
}

/** Элемент ядра: слово/запрос и его приблизительная частотность. */
export interface CoreItem {
  word: string;
  frequency: number;
}

/** Результат генерации: ядро с частотностью по каждому элементу. */
export interface GeneratedCore {
  topic: string;
  keywords: CoreItem[];
  queries: CoreItem[];
  /** true, если ядро и частотность сгенерированы моделью YandexGPT. */
  usedModel: boolean;
}

function normalizeTopic(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function generateSemanticCore(rawTopic: string): SemanticCore | null {
  const topic = normalizeTopic(rawTopic);
  if (!topic) return null;

  const keywords = unique([
    topic,
    `${topic} купить`,
    `купить ${topic}`,
    `${topic} цена`,
    `${topic} недорого`,
    `${topic} оптом`,
    `${topic} на авито`,
    `авито ${topic}`,
    `${topic} продажа`,
    `${topic} от частного продавца`,
    `${topic} бу`,
    `${topic} новые`,
  ]);

  const queries = unique([
    `купить ${topic} недорого`,
    `${topic} купить на авито`,
    `${topic} цена на авито`,
    `где купить ${topic}`,
    `${topic} с доставкой`,
    `${topic} в наличии`,
    `${topic} оптом дешево`,
    `${topic} объявление на авито`,
    `${topic} с рук`,
    `${topic} цена и условия`,
  ]);

  return { topic, keywords, queries };
}

// Множители частотности для смысловых модификаторов запроса.
// Чем специфичнее намерение (оптом, с доставкой и т.п.), тем меньше
// ожидаемое число запросов в месяц. Проверяются в порядке перечисления,
// поэтому более длинные модификаторы идут раньше коротких.
const MODIFIER_MULTIPLIERS: ReadonlyArray<readonly [string, number]> = [
  ["от частного продавца", 0.3],
  ["цена и условия", 0.45],
  ["с доставкой", 0.35],
  ["объявление на авито", 0.4],
  ["в наличии", 0.5],
  ["на авито", 0.55],
  ["авито", 0.7],
  ["недорого", 0.5],
  ["дешево", 0.5],
  ["оптом", 0.4],
  ["купить", 0.7],
  ["цена", 0.6],
  ["продажа", 0.6],
  ["с рук", 0.45],
  ["бу", 0.5],
  ["новые", 0.55],
  ["где", 0.5],
];

function baseFrequencyByTopic(topic: string): number {
  const words = topic.trim().split(/\s+/).length;
  if (words <= 1) return 60_000;
  if (words === 2) return 32_000;
  if (words === 3) return 16_000;
  return 8_000;
}

/**
 * Приблизительная оценка частотности (число запросов в месяц) для фразы.
 * Рассчитывается на основе темы и структуры запроса: чем специфичнее тема
 * и чем больше модификаторов в фразе, тем ниже оценка. Точные данные
 * Wordstat недоступны, поэтому значение является ориентировочным.
 */
export function estimateFrequency(phrase: string, topic: string): number {
  const lower = phrase.toLowerCase();
  const normalizedTopic = normalizeTopic(topic);

  let multiplier = 1;
  for (const [modifier, value] of MODIFIER_MULTIPLIERS) {
    if (lower.includes(modifier)) multiplier *= value;
  }

  const phraseWords = lower.split(/\s+/).length;
  const topicWords = normalizedTopic ? normalizedTopic.split(/\s+/).length : 0;
  const extraWords = Math.max(0, phraseWords - topicWords);
  multiplier *= Math.pow(0.85, extraWords);

  const value = baseFrequencyByTopic(normalizedTopic) * multiplier;
  return Math.max(50, Math.round(value / 50) * 50);
}

/** Форматирование частотности для отображения, например «12 500 / мес». */
export function formatFrequency(frequency: number): string {
  return `${frequency.toLocaleString("ru-RU")} / мес`;
}
