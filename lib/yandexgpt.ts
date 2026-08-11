import "server-only";

/**
 * Серверная интеграция с Яндекс AI Studio (YandexGPT API).
 *
 * API-ключ читается только на сервере из переменной окружения и никогда
 * не попадает в браузер:
 * - переменная называется YANDEXGPT_API_KEY (не префикс NEXT_PUBLIC_,
 *   поэтому Next.js не встраивает её в клиентский бандл);
 * - модуль помечен `import "server-only"`, поэтому импорт из клиентского
 *   компонента приводит к ошибке сборки.
 *
 * Если ключ не задан, все функции безопасно возвращают null / false, и
 * приложение продолжает работать на прежней приблизительной генерации.
 */

export interface YandexGptConfig {
  apiKey: string;
  folderId?: string;
  modelUri: string;
}

export interface YandexGptResult {
  text: string;
  modelUri: string;
}

const DEFAULT_MODEL_URI = "gpt://yandexgpt-lite/latest";

/** Читает конфигурацию YandexGPT из переменных окружения. */
export function getYandexGptConfig(): YandexGptConfig | null {
  const apiKey = process.env.YANDEXGPT_API_KEY?.trim();
  if (!apiKey) return null;

  const folderId = process.env.YANDEXGPT_FOLDER_ID?.trim();
  const modelUri =
    process.env.YANDEXGPT_MODEL_URI?.trim() ??
    (folderId ? `gpt://${folderId}/yandexgpt-lite/latest` : DEFAULT_MODEL_URI);

  return { apiKey, folderId, modelUri };
}

/** Есть ли настроенный API-ключ YandexGPT на сервере. */
export function isYandexGptConfigured(): boolean {
  return getYandexGptConfig() !== null;
}

interface YandexGptCallOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CompletionMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

interface CompletionRequestBody {
  modelUri: string;
  completionOptions: {
    temperature: number;
    maxTokens: string;
  };
  messages: CompletionMessage[];
}

interface CompletionResponse {
  result?: {
    alternatives?: Array<{ message?: { text?: string } }>;
  };
}

const COMPLETION_URL =
  "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

/**
 * Отправляет запрос к YandexGPT на сервере и возвращает текст ответа.
 * Возвращает null, если ключ не задан, запрос не удался или ответ пуст.
 */
export async function callYandexGpt(
  promptText: string,
  options: YandexGptCallOptions = {}
): Promise<YandexGptResult | null> {
  const config = getYandexGptConfig();
  if (!config) return null;

  const messages: CompletionMessage[] = [
    ...(options.systemPrompt
      ? [{ role: "system" as const, text: options.systemPrompt }]
      : []),
    { role: "user", text: promptText },
  ];

  const body: CompletionRequestBody = {
    modelUri: config.modelUri,
    completionOptions: {
      temperature: options.temperature ?? 0.6,
      maxTokens: String(options.maxTokens ?? 3000),
    },
    messages,
  };

  try {
    const response = await fetch(COMPLETION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${config.apiKey}`,
        ...(config.folderId ? { "x-folder-id": config.folderId } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        `Ошибка YandexGPT API: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = (await response.json()) as CompletionResponse;
    const text = data?.result?.alternatives?.[0]?.message?.text?.trim();
    if (!text) return null;

    return { text, modelUri: config.modelUri };
  } catch (error) {
    console.error("Ошибка вызова YandexGPT:", error);
    return null;
  }
}
